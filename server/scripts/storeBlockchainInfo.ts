import WebSocket from 'ws';
import mysql from 'mysql2/promise';
import { poolCredentials } from '../db-config';
import Redis from 'ioredis';
import logger from '../logger';

const WEBSOCKET_URL = 'ws://127.0.0.1:8648/ws';
const MACRO_BLOCK_INTERVAL = 60;
const BLOCKS_AFTER = 1;

// The node restarts (upgrades, crashes) drop this connection. Without these the
// indexer stays up but silently stops recording blocks until it is restarted.
const RECONNECT_DELAY_MIN = 1000;
const RECONNECT_DELAY_MAX = 30000;
// The node produces a block every ~1s, so a long silence means a dead socket
// that never emitted 'close' (half-open TCP). Reconnect rather than wait forever.
const SILENCE_TIMEOUT = 60000;

const TRANSACTION_LIST_KEY = 'transactions';
const MAX_TRANSACTIONS = 25;
const BLOCK_LIST_KEY = 'blocks';
const MAX_BLOCKS = 25;

let blockNumber = 0;
let totalTx = 0;
let maxTps = 0;
let totalSize = 0;
let totalValue = 0;
let totalFee = 0;
let senders: string[] = [];
let receivers: string[] = [];
let currentDatetime = new Date();

const redis = new Redis();

const pool = mysql.createPool(poolCredentials({
  database: 'nimiq',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
}));

// Define message types (Optional, for better type safety)
interface SubscribeMessage {
  method: string;
  params: any;
  id: number;
  jsonrpc: string;
}

interface EventMessage {
  method: string;
  params: {
    subscription: number;
    result: {
      data: any;
      metadata: any;
    };
  };
  jsonrpc: string;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: number;
  fee: number;
  timestamp: number;
}

interface Block {
  hash: string;
  size: number;
  batch: number;
  epoch: number;
  network: string;
  version: number;
  number: number;
  timestamp: number;
  parentHash: string;
  seed: string;
  extraData: string;
  stateHash: string;
  bodyHash: string;
  historyHash: string;
  type: string;
  isElectionBlock: boolean;
  parentElectionHash: string;
  transactions: Transaction[];
  producer?: {
    validator: string;
  };
}

// Initialize WebSocket connection, reconnecting whenever the node goes away
let ws: WebSocket;
let reconnectDelay = RECONNECT_DELAY_MIN;
let reconnectTimer: NodeJS.Timeout | null = null;
let silenceTimer: NodeJS.Timeout | null = null;

function scheduleReconnect() {
  if (reconnectTimer) return;

  logger.info(`Reconnecting to WebSocket server in ${reconnectDelay}ms`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, reconnectDelay);

  reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_DELAY_MAX);
}

function resetSilenceTimer() {
  if (silenceTimer) clearTimeout(silenceTimer);

  silenceTimer = setTimeout(() => {
    logger.error(`No message for ${SILENCE_TIMEOUT}ms, reconnecting.`);
    // 'close' fires from terminate() and triggers the reconnect.
    ws.terminate();
  }, SILENCE_TIMEOUT);
}

function connect() {
  ws = new WebSocket(WEBSOCKET_URL);

  // Handle WebSocket connection open
  ws.on('open', () => {
    logger.info('Connected to WebSocket server.');

    reconnectDelay = RECONNECT_DELAY_MIN;

    // Subscribe to events
    const subscribeMessage: SubscribeMessage = {
      method: 'subscribeForHeadBlock',
      params: [true],
      id: 1,
      jsonrpc: '2.0',
    };

    ws.send(JSON.stringify(subscribeMessage));

    logger.info(`Subscription message sent: ${JSON.stringify(subscribeMessage)}`);

    resetSilenceTimer();
  });

  // Handle incoming messages
  ws.on('message', async (data: any) => {
  resetSilenceTimer();

  try {
    const message: EventMessage = JSON.parse(data.toString());

    if (message.params) {
      const block: Block = message.params.result.data;

      blockNumber = block.number;

      await storeBlocks(block);

      const transactions = block.transactions;

      if (transactions.length > 0) {
        totalTx += transactions.length;
        maxTps = Math.max(maxTps, transactions.length);
        totalSize += block.size;

        transactions.forEach((tx) => {
          totalValue += tx.value;
          totalFee += tx.fee;

          senders.push(tx.from);
          receivers.push(tx.to);
        });

        await storeTransactions(transactions);
      }

      if (((blockNumber % (MACRO_BLOCK_INTERVAL * 15) === BLOCKS_AFTER) && totalTx > 0) || !isSameDay(new Date(), currentDatetime)) {
        totalSize = Math.round(totalSize / 1024);
        totalValue = Math.round(totalValue / 100000000);
        totalFee = Math.round(totalFee / 1000);
        senders = [...new Set(senders)];
        receivers = [...new Set(receivers)];

        try {
          await pool.query(
            'INSERT INTO blockchain_info (`date`, `total_tx`, `max_tps`, `total_fee`, `total_size`, `total_value`, `total_senders`, `total_receivers`) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `total_tx` = `total_tx` + ?, `max_tps` = GREATEST(`max_tps`, ?), `total_fee` = `total_fee` + ?, `total_size` = `total_size` + ?, `total_value` = `total_value` + ?, `total_senders` = GREATEST(`total_senders`, ?), `total_receivers` = GREATEST(`total_receivers`, ?)',
            [formatDatetime(currentDatetime), totalTx, maxTps, totalFee, totalSize, totalValue, senders.length, receivers.length, totalTx, maxTps, totalFee, totalSize, totalValue, senders.length, receivers.length],
          );

          totalTx = 0;
          maxTps = 0;
          totalFee = 0;
          totalSize = 0;
          totalValue = 0;

          if (!isSameDay(new Date(), currentDatetime)) {
            senders = [];
            receivers = [];
          }

          currentDatetime = new Date();

          logger.info('Blockchain info saved to database.');
        } catch (error) {
          logger.error(`error: ${JSON.stringify(error)}`);
        }
      }
    }
  } catch (error) {
    logger.error(`error: ${JSON.stringify(error)}`);
  }
  });

  // Handle WebSocket errors
  ws.on('error', (error: any) => {
    // 'close' always follows 'error', so reconnecting is left to the close handler.
    logger.error(`WebSocket error: ${error.message}`);
  });

  // Handle WebSocket close
  ws.on('close', (code: any, reason: any) => {
    if (silenceTimer) clearTimeout(silenceTimer);
    logger.info(`WebSocket connection closed. Code: ${code}, Reason: ${reason}`);
    scheduleReconnect();
  });
}

connect();

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function formatDatetime(date: Date): string {
  const d = date,
      month = '0' + (d.getMonth()+1),
      day = '0' + d.getDate(),
      year = d.getFullYear();

  return year + '-' + month.substr(-2) + '-' + day.substr(-2);
}

async function storeTransactions(transactions: Transaction[]) {
  // Sort transactions by timestamp (newest first)
  const sortedTransactions = transactions.sort((a, b) => b.timestamp - a.timestamp);
  
  // Convert transactions to JSON
  const transactionStrings = sortedTransactions.map((transaction) => 
    JSON.stringify({
      hash: transaction.hash,
      from: transaction.from,
      to: transaction.to,
      value: transaction.value,
      fee: transaction.fee,
      timestamp: transaction.timestamp,
    })
  );

  // Add transactions to Redis list
  await redis.lpush(TRANSACTION_LIST_KEY, ...transactionStrings);

  // Trim list to keep only the latest 50 transactions
  await redis.ltrim(TRANSACTION_LIST_KEY, 0, MAX_TRANSACTIONS - 1);
}

async function storeBlocks(block: Block) {
  // Convert blocks to JSON
  const blockStrings = [
    JSON.stringify({
      epoch: block.epoch,
      batch: block.batch,
      blockNumber: block.number,
      type: block.type,
      producer: block.producer?.validator || null,
      size: block.size,
      txCount: block.transactions.length || 0,
      timestamp: block.timestamp,
    })
  ];

  // Add blocks to Redis list
  await redis.lpush(BLOCK_LIST_KEY, ...blockStrings);

  // Trim list to keep only the latest 50 blocks
  await redis.ltrim(BLOCK_LIST_KEY, 0, MAX_BLOCKS - 1);
}

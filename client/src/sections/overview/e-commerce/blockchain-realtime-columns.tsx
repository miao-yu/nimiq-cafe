import type { IBlockItem, ITransactionItem, IExplorerBlockItem, IExplorerTransactionItem } from 'src/types/blockchain';

import { useState, useEffect } from 'react';

import Grid from '@mui/material/Grid2';

import { fNumber, fPercent } from 'src/utils/format-number';
import { fBlockData, fTransactionData } from 'src/utils/format-blockchain';

import { CONFIG } from 'src/global-config';
import DashboardBlock from 'src/placeholders/dashboard-block';
import DashboardTransaction from 'src/placeholders/dashboard-transaction';
import { useGetLatestBlocks, useGetLatestTransactions } from 'src/actions/blockchain';

import { BlockWidget } from './block-widget';
import { TransactionWidget } from './transaction-widget';
import { BlockchainRealtimeSimple } from './blockchain-realtime-simple';

// ----------------------------------------------------------------------

export function BlockchainRealtimeColumns() {
  const { latestBlocks } = useGetLatestBlocks();
  const { latestTransactions } = useGetLatestTransactions();
  const [blocks, setBlocks] = useState<IExplorerBlockItem[]>([]);
  const [transactions, setTransactions] = useState<IExplorerTransactionItem[]>([]);

  useEffect(() => {
    const initialBlocks = latestBlocks.slice(0, 4).map((block: IBlockItem) => fBlockData(block));
    setBlocks(initialBlocks);
  }, [latestBlocks]);

  useEffect(() => {
    const initialTransactions = latestTransactions.slice(0, 4).map((tx: ITransactionItem) => fTransactionData(tx));
    setTransactions(initialTransactions);
  }, [latestTransactions]);
  
  const [block, setBlock] = useState<IBlockItem>({
    epoch: 0,
    batch: 0,
    blockNumber: 0,
    type: 'micro',
    producer: null,
    size: 0,
    transactions: [],
    timestamp: new Date().getTime(),
  });

  useEffect(() => {
    const ws = new WebSocket(CONFIG.wsServerUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.event === 'newBlock') {
        const blockData = message.data;
        setBlock(blockData);

        const newBlock = fBlockData(blockData);

        setBlocks((prevBlocks) => {
          const updatedBlocks = [newBlock, ...prevBlocks];

          return updatedBlocks.slice(0, 4);
        });

        if (blockData.transactions.length > 0) {
          const newTransactions = blockData.transactions.map((tx: ITransactionItem) => fTransactionData(tx));

          setTransactions((prevTransactions) => {
            const updatedTransactions = [...newTransactions, ...prevTransactions];

            return updatedTransactions.slice(0, 4);
          });
        }
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [block]);
  
  const epochProgress = (block.blockNumber % 43200) / 43200 * 100;
  
  return (
    <>
      <Grid size={{ xs: 6, md: 3}}>
        <BlockchainRealtimeSimple
          title="Epoch #"
          color="error"
          text={fNumber(block.epoch)}
        />
      </Grid>

      <Grid size={{ xs: 6, md: 3 }}>
        <BlockchainRealtimeSimple
          title="Epoch Progress"
          color="primary"
          text={fPercent(epochProgress)}
        />
      </Grid>

      <Grid size={{ xs: 6, md: 3 }}>
        <BlockchainRealtimeSimple
          title="Batch #"
          color="secondary"
          text={fNumber(block.batch)}
        />
      </Grid>

      <Grid size={{ xs: 6, md: 3 }}>
        <BlockchainRealtimeSimple
          title="Block #"
          color="warning"
          text={fNumber(block.blockNumber)}
        />
      </Grid>

      <Grid container spacing={3} size={{ xs: 12 }}>
        {blocks.length > 0 ? blocks
        .map((blockElement) => (
          <Grid size={{ xs: 6, md: 3 }}>
            <BlockWidget
              key={blockElement.number}
              block={blockElement}
            />
          </Grid>
        )) : getBlockPlaceholderCards(4)}
      </Grid>

      <Grid container spacing={3} size={{ xs: 12 }}>
        {transactions.length > 0 ? transactions
        .map((tx) => (
          <Grid size={{ xs: 6, md: 3 }}>
            <TransactionWidget
              key={tx.hash}
              tx={tx}
            />
          </Grid>
        )) : getTransactionPlaceholderCards(4)}
      </Grid>
    </>
  );
}

export function getBlockPlaceholderCards(number: number): JSX.Element[] {
  return Array.from({ length: number }, (_, index) => (
    <DashboardBlock key={index} />
  ));
}

export function getTransactionPlaceholderCards(number: number): JSX.Element[] {
  return Array.from({ length: number }, (_, index) => (
    <DashboardTransaction key={index} />
  ));
}

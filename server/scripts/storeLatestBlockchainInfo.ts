import mysql from 'mysql2/promise';
import { poolCredentials } from '../db-config';
import { RowDataPacket } from 'mysql2';
import logger from '../logger';
import { readFile, writeFile } from 'fs';

interface BlockchainInfoDataPacket extends RowDataPacket {
    date: string;
    total_tx: number;
    max_tps: number;
    total_fee: number;
    total_size: number;
    total_value: number;
    total_senders: number;
    total_receivers: number;
};

function formatDate(date: Date): string {
    const month = '0' + (date.getMonth() + 1);
    const day = '0' + date.getDate();

    return date.getFullYear() + '-' + month.substr(-2) + '-' + day.substr(-2);
}

readFile(__dirname + '/../json/blockchain-info.json', 'utf-8', async (err, historyData) => {
    if (err) {
        console.error('Error reading the file:', err);
        return;
    }

    let history = JSON.parse(historyData);

    const connection = await mysql.createConnection(poolCredentials({ database: 'nimiq' }));

    // Ask for yesterday by date. This used to take whichever row happened to be
    // second-newest, so while the indexer was down it kept re-appending the same
    // stale row every night -- 18 copies of 2026-07-12 accumulated in July 2026.
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const date = formatDate(yesterday);

    const [data] = await connection.query<BlockchainInfoDataPacket[]>(
        'SELECT date, total_tx, max_tps, total_fee, total_size, total_value, total_senders, total_receivers FROM blockchain_info WHERE date = ? LIMIT 1',
        [date]
    );

    await connection.end();

    if (!data.length) {
        logger.error(`No blockchain_info row for ${date}, nothing recorded.`);
        return;
    }

    // Belt and braces: never append a date the file already carries.
    if (history.some((entry: { date: string }) => String(entry.date).slice(0, 10) === date)) {
        logger.info(`${date} is already recorded, skipping.`);
        return;
    }

    history.unshift(data[0]);

    writeFile(__dirname + '/../json/blockchain-info.json', JSON.stringify(history), async () => {
        logger.info(`DONE (added ${date})`);
    });
});

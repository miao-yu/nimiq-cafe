import mysql from 'mysql2/promise';
import { poolCredentials } from '../db-config';
import { RowDataPacket } from 'mysql2';
import logger from '../logger';
import { readFile, writeFile } from 'fs';

interface BlockchainInfoDataPacket extends RowDataPacket {
    date: string;
    x_followers: number;
    cmc_rank: number;
    tg_members: number;
};

readFile(__dirname + '/../json/socialmedia-info.json', 'utf-8', async (err, historyData) => {
    if (err) {
        console.error('Error reading the file:', err);
        return;
    }

    let history = JSON.parse(historyData);

    const connection = await mysql.createConnection(poolCredentials({ database: 'nimiq' }));

    const [data] = await connection.query<BlockchainInfoDataPacket[]>(
        'SELECT date, x_followers, cmc_rank, tg_members FROM socialmedia_info ORDER BY date DESC LIMIT 1'
    );

    if (data.length > 0) {
        history.unshift(data[0]);
        writeFile(__dirname+'/../json/socialmedia-info.json', JSON.stringify(history), async () => {
            await connection.end();
            logger.info('DONE');
        });
    } else {
        await connection.end();
        logger.info('DONE');
    }
});
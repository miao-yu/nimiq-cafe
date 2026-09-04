import mysql from 'mysql2/promise';
import { poolCredentials } from '../db-config';
import { RowDataPacket } from 'mysql2';
import logger from '../logger';
import { readFile, writeFile } from 'fs';

interface StakingInfoDataPacket extends RowDataPacket {
    validator: number;
    stakers: number;
    total_staked: number;
    created_at: string;
};

readFile(__dirname + '/../json/staking-info.json', 'utf-8', async (err, historyData) => {
    if (err) {
        console.error('Error reading the file:', err);
        return;
    }

    let history = JSON.parse(historyData);

    const connection = await mysql.createConnection(poolCredentials({ database: 'nimiq' }));

    const [stakingInfo] = await connection.query<StakingInfoDataPacket[]>(
        'SELECT validator, stakers, total_staked, created_at FROM staking_info ORDER BY created_at DESC LIMIT 1'
    );

    history.unshift(stakingInfo[0]);
    writeFile(__dirname+'/../json/staking-info.json', JSON.stringify(history), async () => {
        await connection.end();
        logger.info('DONE');
    });
});
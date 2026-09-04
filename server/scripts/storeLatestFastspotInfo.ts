import mysql from 'mysql2/promise';
import { poolCredentials } from '../db-config';
import { RowDataPacket } from 'mysql2';
import logger from '../logger';
import { readFile, writeFile } from 'fs';

interface FastspotInfoDataPacket extends RowDataPacket {
    date: string;
    nimbtc_volume_usd: number;
    nimbtc_count: number;
    btcusdc_volume_usd: number;
    btcusdc_count: number;
    btcusdt_volume_usd: number;
    btcusdt_count: number;
    nimusdt_volume_usd: number;
    nimusdt_count: number;
    nimusdc_volume_usd: number;
    nimusdc_count: number;
    total_volume: number;
    total_count: number;
};

readFile(__dirname + '/../json/fastspot-info.json', 'utf-8', async (err, historyData) => {
    if (err) {
        console.error('Error reading the file:', err);
        return;
    }

    let history = JSON.parse(historyData);

    const connection = await mysql.createConnection(poolCredentials({ database: 'nimiq' }));

    const [data] = await connection.query<FastspotInfoDataPacket[]>(
        'SELECT date, nimbtc_volume_usd, nimbtc_count, btcusdc_volume_usd, btcusdc_count, btcusdt_volume_usd, btcusdt_count, nimusdt_volume_usd, nimusdt_count, nimusdc_volume_usd, nimusdc_count, total_volume, total_count FROM fastspot_info ORDER BY date DESC LIMIT 1'
    );

    if (data.length > 0) {
        history.unshift(data[0]);
        writeFile(__dirname+'/../json/fastspot-info.json', JSON.stringify(history), async () => {
            await connection.end();
            logger.info('DONE');
        });
    } else {
        await connection.end();
        logger.info('DONE');
    }
});
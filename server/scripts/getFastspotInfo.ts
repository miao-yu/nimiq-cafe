import mysql from 'mysql2/promise';
import { poolCredentials } from '../db-config';
import { RowDataPacket } from 'mysql2';
import logger from '../logger';
import { writeFile } from 'fs';

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

(async function () {
    const connection = await mysql.createConnection(poolCredentials({ database: 'nimiq' }));

    let data: FastspotInfoDataPacket[] = [];

    let limit = 100;
    let skip = 0;
    (async function getHistory() {

        const [history] = await connection.query<FastspotInfoDataPacket[]>(
            'SELECT date, nimbtc_volume_usd, nimbtc_count, `btcusdc_volume_usd`, `btcusdc_count`, `btcusdt_volume_usd`, `btcusdt_count`, `nimusdt_volume_usd`, `nimusdt_count`, nimusdc_volume_usd, nimusdc_count, total_volume, total_count FROM fastspot_info ORDER BY date DESC LIMIT ? OFFSET ?',
            [limit, skip]
          );

        if (history.length > 0) {
            data = data.concat(history);

            skip += limit;

            getHistory();
        } else {
            writeFile(__dirname+'/../json/fastspot-info.json', JSON.stringify(data), async () => {
                await connection.end();
                logger.info('DONE');
            });
        }
    })();
})();
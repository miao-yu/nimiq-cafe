import mysql from 'mysql2/promise';
import { poolCredentials } from '../db-config';
import { RowDataPacket } from 'mysql2';
import logger from '../logger';
import { writeFile } from 'fs';
import { log } from 'console';

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

(async function () {
    const connection = await mysql.createConnection(poolCredentials({ database: 'nimiq' }));

    let data: BlockchainInfoDataPacket[] = [];

    let limit = 100;
    let skip = 0;
    (async function getHistory() {

        const [history] = await connection.query<BlockchainInfoDataPacket[]>(
            'SELECT date, total_tx, max_tps, total_fee, total_size, total_value, total_senders, total_receivers FROM blockchain_info ORDER BY date DESC LIMIT ? OFFSET ?',
            [limit, skip]
          );

        if (history.length > 0) {
            data = data.concat(history);

            skip += limit;

            getHistory();
        } else {
            data.shift();
            writeFile(__dirname+'/../json/blockchain-info.json', JSON.stringify(data), async () => {
                await connection.end();
                logger.info('DONE');
            });
        }
    })();
})();
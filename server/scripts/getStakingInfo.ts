import mysql from 'mysql2/promise';
import { poolCredentials } from '../db-config';
import { RowDataPacket } from 'mysql2';
import logger from '../logger';
import { writeFile } from 'fs';

interface StakingInfoDataPacket extends RowDataPacket {
    validator: number;
    stakers: number;
    total_staked: number;
    created_at: string;
};

(async function () {
    const connection = await mysql.createConnection(poolCredentials({ database: 'nimiq' }));

    let data: StakingInfoDataPacket[] = [];

    let limit = 100;
    let skip = 0;
    (async function getHistory() {

        const [history] = await connection.query<StakingInfoDataPacket[]>(
            'SELECT validator, stakers, total_staked, created_at FROM staking_info ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [limit, skip]
          );

        if (history.length > 0) {
            data = data.concat(history);

            skip += limit;

            getHistory();
        } else {
            writeFile(__dirname+'/../json/staking-info.json', JSON.stringify(data), async () => {
                await connection.end();
                logger.info('DONE');
            });
        }
    })();
})();
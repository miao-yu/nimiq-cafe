import mysql from 'mysql2/promise';
import { poolCredentials } from '../db-config';
import { RowDataPacket } from 'mysql2';
import logger from '../logger';
import { writeFile } from 'fs';

interface SocialmediaInfoDataPacket extends RowDataPacket {
    date: string;
    x_followers: number;
    cmc_rank: number;
    tg_members: number;
};

(async function () {
    const connection = await mysql.createConnection(poolCredentials({ database: 'nimiq' }));

    let data: SocialmediaInfoDataPacket[] = [];

    let limit = 100;
    let skip = 0;
    (async function getHistory() {

        const [history] = await connection.query<SocialmediaInfoDataPacket[]>(
            'SELECT date, x_followers, cmc_rank, tg_members FROM socialmedia_info ORDER BY date DESC LIMIT ? OFFSET ?',
            [limit, skip]
          );

        if (history.length > 0) {
            data = data.concat(history);

            skip += limit;

            getHistory();
        } else {
            writeFile(__dirname+'/../json/socialmedia-info.json', JSON.stringify(data), async () => {
                await connection.end();
                logger.info('DONE');
            });
        }
    })();
})();
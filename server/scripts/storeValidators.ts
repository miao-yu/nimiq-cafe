import { add } from 'winston';
import logger from '../logger';
import { readFile, writeFile } from 'fs';

const JSON_RPC_URL = 'http://127.0.0.1:8648';

interface Pool {
  address: string;
  name: string;
  logo: string;
  website: string;
  description: string;
  fee: number;
  payoutType: string;
  payoutSchedule: string;
  score: {
    total: number;
    availability: number;
    dominance: number;
    reliability: number;
  },
  dominanceRatio: number;
};

interface FormattedPool {
  address: string;
  name: string;
  logo: string;
  website: string;
  description: string;
  fee: number;
  payoutType: string;
  payoutSchedule: string;
  scoreOverall: number;
  scoreDetail: {
    availability: number;
    dominance: number;
    reliability: number;
  },
  dominanceRatio: number;
};

(async () => {
  const getValidatorsResult = await fetch(JSON_RPC_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'getValidators',
      params: [],
      id: 1,
    }),
  });

  const getValidatorsData = await getValidatorsResult.json();
  const validators = getValidatorsData.result.data;

  if (!Array.isArray(validators) || validators.length === 0) {
    logger.error('Refusing to write validators.json: RPC returned no validators');
    process.exit(1);
  }

  readFile(__dirname + '/../json/pools.json', 'utf-8', async (err, pools) => {
    if (err) {
        console.error('Error reading the file:', err);
        return;
    }

    // An empty or malformed pools.json used to throw here, leaving validators.json
    // stale indefinitely with nothing logged. Fail loudly and keep the last good file.
    let poolsData: Pool[];
    try {
      poolsData = JSON.parse(pools);
    } catch (error: any) {
      logger.error(`Refusing to write validators.json: pools.json is not valid JSON (${error.message})`);
      process.exit(1);
    }

    if (!Array.isArray(poolsData) || poolsData.length === 0) {
      logger.error('Refusing to write validators.json: pools.json is empty');
      process.exit(1);
    }

    let poolsDataMap: Record<string, FormattedPool> = {};
    poolsData.forEach(pool => {
      const poolData: FormattedPool = {
        address: pool.address,
        name: pool.name,
        logo: pool.logo,
        website: pool.website,
        description: pool.description,
        fee: pool.fee,
        payoutType: pool.payoutType,
        payoutSchedule: pool.payoutSchedule,
        scoreOverall: 0,
        scoreDetail: {
          availability: 0,
          dominance: 0,
          reliability: 0,
        },
        dominanceRatio: pool.dominanceRatio,
      };

      if (pool.score) {
        poolData.scoreOverall = pool.score.total;
        poolData.scoreDetail = {
          availability: pool.score.availability,
          dominance: pool.score.dominance,
          reliability: pool.score.reliability,
        };
      }

      poolsDataMap[pool.address] = poolData;
    });

    const validatorsData = validators.map((validator: any) => {
      return {
        ...poolsDataMap[validator.address],
        ...validator,
        name: poolsDataMap[validator.address] ? poolsDataMap[validator.address].name : validator.address,
        logo: poolsDataMap[validator.address] ? poolsDataMap[validator.address].logo : `https://v2.nimiqwatch.com/api/v1/iqon/${validator.address.replaceAll(' ', '+')}`,
        website: poolsDataMap[validator.address] ? poolsDataMap[validator.address].website : null,
      };
    });

    writeFile(__dirname+'/../json/validators.json', JSON.stringify(validatorsData), async () => {
      logger.info('DONE');
    });
  });
})();
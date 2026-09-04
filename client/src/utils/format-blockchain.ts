import type { IBlockItem, ITransactionItem, IExplorerBlockItem, IExplorerTransactionItem } from 'src/types/blockchain';

import { paths } from 'src/routes/paths';

import { fSecondsSince } from './format-time';
import addressBook from '../../../server/json/address-book.json';

interface AddressBook {
  [key: string]: {
    name: string;
    logo?: string;
  };
}

const typedAddressBook: AddressBook = addressBook;

// ----------------------------------------------------------------------

export function fShortenString(inputValue: string, maxLength: number = 8) {
  if (inputValue.length <= maxLength) return inputValue;

  const visibleChars = Math.floor(maxLength / 2);
  const firstPart = inputValue.slice(0, visibleChars);
  const lastPart = inputValue.slice(-visibleChars);

  return `${firstPart}•••${lastPart}`;
}

export function fShortenName(name: string, maxLength: number = 8) {
  return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
}

export function fIdentifyHashOrAddress(input: string): boolean {
  const hashRegex = /^[a-f0-9]{64}$/i; // Matches a 64-character hexadecimal string
  const addressRegex = /^NQ[0-9A-Z]{2}( [0-9A-Z]{4}){8}$/; // Matches Nimiq address pattern

  if (hashRegex.test(input) || addressRegex.test(input)) {
    return true;
  } else {
    return false;
  }
}

export function fCapitalizeString(inputValue: string) {
  return inputValue.charAt(0).toUpperCase() + inputValue.slice(1);
}

export function fAddressInfo(address: string) {
  const addressInfo = typedAddressBook[address];

  let name = '';
  if (addressInfo && addressInfo.name) {
    name = addressInfo.name.length > 20 ? fShortenString(addressInfo.name) : addressInfo.name;
  }

  return name ? {
    ...addressInfo,
    name,
  } : null;
};

export function fBlockData(block: IBlockItem): IExplorerBlockItem {
  const blockData: IExplorerBlockItem = {
    number: block.blockNumber,
    tx: block.txCount || (block.transactions ? block.transactions.length : 0),
    link: `/block/${block.blockNumber}`,
    type: block.type,
    timestamp: block.timestamp,
    secondsSince: fSecondsSince(block.timestamp),
  };

  if (block.producer) {
    const addressInfo = fAddressInfo(block.producer);
    blockData.producer = {
      name: addressInfo ? addressInfo.name : (block.producer || ''),
      avatar: (addressInfo && addressInfo.logo) ? (addressInfo.logo || '') : `https://v2.nimiqwatch.com/api/v1/iqon/${block.producer.replaceAll(' ', '+')}`,
      link: `/wallet/${block.producer}`,
    };
  }

  return blockData;
};

export function fTransactionData(tx: ITransactionItem): IExplorerTransactionItem {
  const fromAddressInfo = fAddressInfo(tx.from);
  const fromName = fromAddressInfo ? fromAddressInfo.name : tx.from;
  const fromAvatar = fromAddressInfo && fromAddressInfo.logo ? fromAddressInfo.logo : `https://v2.nimiqwatch.com/api/v1/iqon/${tx.from.replaceAll(' ', '+')}`;

  const toAddressInfo = fAddressInfo(tx.to);
  const toName = toAddressInfo ? toAddressInfo.name : tx.to;
  const toAvatar = toAddressInfo && toAddressInfo.logo ? toAddressInfo.logo : `https://v2.nimiqwatch.com/api/v1/iqon/${tx.to.replaceAll(' ', '+')}`;
  
  return {
    hash: tx.hash,
    from: tx.from,
    fromName,
    fromAvatar,
    fromLink: `${paths.wallet}/${tx.from}`,
    to: tx.to,
    toName,
    toAvatar,
    toLink: `${paths.wallet}/${tx.to}`,
    value: tx.value / 1e5,
    fee: tx.fee / 1e5,
    timestamp: tx.timestamp,
    link: `${paths.tx}/${tx.hash}`,
  };
};

export function fBytes(bytes: number) {
  const kb = bytes / 1024; // 1 KB = 1024 B
  const mb = kb / 1024; // 1 MB = 1024 KB
  const gb = mb / 1024; // 1 GB = 1024 MB

  if (gb >= 1) {
      return gb.toFixed(2) + ' GB';
  } else if (mb >= 1) {
      return mb.toFixed(2) + ' MB';
  } else if (kb >= 1) {
      return kb.toFixed(2) + ' KB';
  } else {
      return bytes + ' B';
  }
}

export function fCalcPercentageChange(data: { date: string; value: number }[] | undefined): number | 0 {
  if (data === undefined) {
    return 0;
  }
  
  if (data.length < 2) {
    return 0;
  }

  const lastValue = data[data.length - 1].value;
  const secondLastValue = data[data.length - 2].value;

  if (secondLastValue === 0) {
    return 0;
  }

  const percentageChange = ((lastValue - secondLastValue) / secondLastValue) * 100;
  return percentageChange;
}

export const TOTAL_SUPPLY = 21e14;

export function fPoSSupplyAt(timestampMs: number): number {
  const PROOF_OF_STAKE_FORK_DATE = new Date('2024-11-19T16:45:20.000Z');
  const SUPPLY_AT_PROOF_OF_STAKE_FORK_DATE = 12_893_109_654.06244;
  const SUPPLY_DECAY = 0.9999999999960264;

  const ts = timestampMs - PROOF_OF_STAKE_FORK_DATE.getTime();
  if (ts < 0) {
    throw new Error('currentTime must be greater or equal to genesisTime');
  }

  return Math.round(
    (TOTAL_SUPPLY -
      (TOTAL_SUPPLY - SUPPLY_AT_PROOF_OF_STAKE_FORK_DATE * 1e5) *
        _powi(SUPPLY_DECAY, ts)) /
      1e5
  );
}

function _powi(x: number, n: number): number {
  if (n < 0) {
    x = 1 / x;
    n *= -1;
  }
  if (!n) return 1;

  let y = 1;
  while (n > 1) {
    if (n % 2) {
      y *= x;
      n -= 1;
    }
    x *= x;
    n /= 2;
  }
  return x * y;
}

interface StakingRewardsParams {
  startSupply: number;
  endSupply: number;
  circulatingSupplyStaked: number;
  personalStaked: number;
  stakingPeriod: number;
  poolFee: number;
  price: number;
  restake?: boolean;
}

interface StakingRewardsResult {
  totalRewards: number;
  finalStaked: number;
  rewardsValue: number;
  totalPoolFeeNIM: number;
  poolFeeValue: number;
  rewardPercentage: number;
}

export function fCalcStakingRewards({
  startSupply,
  endSupply,
  circulatingSupplyStaked,
  personalStaked,
  stakingPeriod,
  poolFee,
  price,
  restake = true,
}: StakingRewardsParams): StakingRewardsResult {
  let totalStaked = (startSupply * circulatingSupplyStaked) / 100;

  const epochDuration = 0.5;
  const epochs = Math.floor(stakingPeriod / epochDuration);

  const newSupplyPerEpoch = (endSupply - startSupply) / epochs;
  let totalRewards = 0;
  let totalPoolFeeNIM = 0;
  let currentPersonalStaked = personalStaked;

  for (let i = 0; i < epochs; i++) {
    const personalGrossRewards =
      newSupplyPerEpoch * (currentPersonalStaked / totalStaked);
    const personalPoolFee = personalGrossRewards * (poolFee / 100);
    const personalNetRewards = personalGrossRewards - personalPoolFee;

    if (restake) {
      currentPersonalStaked += personalNetRewards;
    }

    totalRewards += personalNetRewards;
    totalPoolFeeNIM += personalPoolFee;
    totalStaked += (newSupplyPerEpoch * circulatingSupplyStaked) / 100;
  }

  const rewardsValue = totalRewards * price;
  const poolFeeValue = totalPoolFeeNIM * price;
  const rewardPercentage = (totalRewards / personalStaked) * 100;

  return {
    totalRewards,
    finalStaked: currentPersonalStaked,
    rewardsValue,
    totalPoolFeeNIM,
    poolFeeValue,
    rewardPercentage,
  };
};

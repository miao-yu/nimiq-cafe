import type { IPriceInfoItem } from './blockchain';

// ----------------------------------------------------------------------

export type IPortfolioValidator = {
  address: string;
  name: string;
  avatar: string;
  addressLink: string;
  balance: number | null;
  isNimiqCafe: boolean;
};

export type IPortfolioAccount = {
  address: string;
  name: string;
  liquid: number;
  staked: number;
  inactive: number;
  retired: number;
  validator: IPortfolioValidator | null;
  /** False for an address that has never received NIM -- empty, not broken. */
  onChain: boolean;
};

export type IPortfolioHistoryPoint = {
  date: string;
  liquid: number;
  staked: number;
  inactive: number;
  retired: number;
  nimUsd: number | null;
  /**
   * Derived by walking today's balance back through transactions and restakes,
   * rather than recorded that day. Totals are exact; the liquid/staked split
   * folds inactive and retired into staked.
   */
  reconstructed?: boolean;
};

export type IPortfolioRewards = {
  total: number;
  today: number;
  last30Days: number;
  daily: { date: string; rewards: number }[];
  /**
   * Absent when the figures come from our own ledger. 'nimiq-watch' means they
   * were backfilled from the chain for a staker whose validator is not ours,
   * which the page says out loud rather than passing off as our own record.
   */
  source?: 'nimiq-watch';
};

export type IPortfolioBackfill = {
  /** Reward history is still being fetched for at least one address. */
  pending: boolean;
  /** Past balances are still being reconstructed for at least one address. */
  historyPending: boolean;
  syncedTo: string | null;
};

export type IPortfolioPitch = {
  totalStaked: number;
  current: {
    address: string;
    validatorName: string;
    fee: number | null;
    staked: number;
  }[];
  ourFee: number;
  weightedFee: number | null;
  feeDifference: number | null;
};

/**
 * Tier is how much the page can show, and it is decided by the chain:
 *   1 -- an account and nothing staked
 *   2 -- staking, but with another validator, so we have no reward history
 *   3 -- staking here, so we do
 */
export type PortfolioTier = 1 | 2 | 3;

export type IPortfolio = {
  signedInAddress: string;
  addresses: string[];
  tier: PortfolioTier;
  accounts: IPortfolioAccount[];
  totals: {
    liquid: number;
    staked: number;
    inactive: number;
    retired: number;
    total: number;
  };
  price: IPriceInfoItem | null;
  history: IPortfolioHistoryPoint[];
  rewards: IPortfolioRewards | null;
  payouts: unknown[] | null;
  backfill: IPortfolioBackfill;
  pitch: IPortfolioPitch | null;
};

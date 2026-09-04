// ----------------------------------------------------------------------

import type { IWalletStakerItem } from "./blockchain";

export type IPoolItem = {
  name: string;
  logo: string;
  address: string;
  addressLink: string;
  balance: number;
  numStakers: number;
  balanceShare: number;
  numStakersShare: number;
  isElected: boolean;
  rewardAddress: string;
  signingKey: string;
  votingKey: string;
  website: null;
  description: string;
  fee: number;
  payoutType: string;
  payoutSchedule: string;
  scoreOverall: number;
  scoreDetail: {
      availability: number;
      dominance: number;
      reliability: number
  };
  dominanceRatio: number;
  stakers?: IWalletStakerItem[];
};

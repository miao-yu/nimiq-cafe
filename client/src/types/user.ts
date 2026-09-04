// ----------------------------------------------------------------------

export type IPoolStakerTableFilters = {
  address: string;
};

export type IPayoutHistoryTableFilters = {
  address: string;
};

export type IPoolRewardsTableFilters = {
  txHash: string;
};

export type IPoolStakerItem = {
  address: string;
  addressLink: string;
  avatar: string;
  shared: number;
  stakedNIM: number;
  inactiveBalance?: number;
  walletBalance?: number;
  totalBalance?: number;
  pendingPayout: number;
  payoutType: string;
  joinDate: string;
};

export type IUserItem = {
  address: string;
};

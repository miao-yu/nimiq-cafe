// ----------------------------------------------------------------------


export type IStakedInfoItem = {
  network: {
    totalValidators: number;
    totalStakers: number;
    totalBalance: number;
  },
  validator: {
    poolShare: number;
    poolTotalStakers: number;
    poolTotalBalance: number;
  }
};

export type IPayoutHistoryItem = {
  txHash: string;
  txHashLink: string;
  epoch: number;
  address: string;
  addressLink: string;
  avatar: string;
  rewards: number;
  payoutType: string;
  createdAt: string;
};

export type IActiveAccountItem = {
  lastMonth: number;
  lastYear: number;
  total: number;
};

export type IPoolRewardItem = {
  txHash: string;
  txHashLink: string;
  blockNumber: number;
  blockNumberLink: string;
  epoch: number;
  value: number;
  createdAt: string;
};

export type IRewardItem = {
  epoch: number;
  reward: number;
  created: string;
};

export type ITotalRewardsItem = {
  totalRewards: number;
  todayRewards: number;
  last30DaysRewards: number;
  pendingPayout: number;
};

export type IElectedValidatorItem = {
  name: string;
  logo: string;
  addressLink: string;
  balance: number;
  numStakers: number;
  numSlots: number;
  balanceShare: number;
  numStakersShare: number;
  numSlotsShare: number;
  rank: number;
};

export type ISupplyCurveItem = {
  supply: number;
  datetime: string;
};

export type IPriceInfoItem = {
  datetime: string;
  price: number;
  priceChange: number;
  volume: number;
  volumeChange: number;
  marketCap: number;
  rank: number;
};

export type IDailyTransactionItem = {
  dailyTXs: {
    date: string;
    value: number;
  }[];
  dailyTPS: {
    date: string;
    value: number;
  }[];
  dailyBurstTPS: {
    date: string;
    value: number;
  }[];
  dailyTXVolume: {
    date: string;
    value: number;
  }[];
  dailyActiveUsers: {
    date: string;
    value: number;
  }[];
  dailyBlockSizes: {
    date: string;
    value: number;
  }[];
  dailyFees: {
    date: string;
    value: number;
  }[];
};

export type IDailyStakedinfoItem = {
  dailyValidators: {
    date: string;
    value: number;
  }[];
  dailyStakers: {
    date: string;
    value: number;
  }[];
  dailyTotalStaked: {
    date: string;
    value: number;
  }[];
};

export type IDailySocialmediaInfoItem = {
  dailyXFollowers: {
    date: string;
    value: number;
  }[];
  dailyCMCRank: {
    date: string;
    value: number;
  }[];
  dailyTGMembers: {
    date: string;
    value: number;
  }[];
};

export type IDailyFastspotInfoItem = {
  date: string;
  nimbtcVolume: number;
  nimbtcCount: number;
  btcusdcVolume: number;
  btcusdcCount: number;
  btcusdtVolume: number;
  btcusdtCount: number;
  nimusdtVolume: number;
  nimusdtCount: number;
  nimusdcVolume: number;
  nimusdcCount: number;
  totalVolume: number;
  totalCount: number
};

export type ITodayActiveUserItem = {
  totalSenders: number;
  totalReceivers: number;
};

export type IDailyRewardsItem = {
  totalRewards: number;
  rewardDate: string;
};

export type IPayoutItem = {
  epoch: number;
  reward: number;
  payoutType: string;
  txHash: string;
  created: string;
};

export type ITransactionItem = {
  hash: string,
  from: string,
  to: string,
  value: number,
  fee: number,
  timestamp: number
};

export type ISettingItem = {
  payoutType: 'Restake' | 'Payout',
};

export type IBlockItem = {
  epoch: number,
  batch: number,
  blockNumber: number,
  type: 'micro' | 'macro',
  producer: string | null,
  size: number,
  transactions: ITransactionItem[],
  txCount?: number,
  timestamp: number,
};

export type IExplorerBlockItem = {
  number: number;
  link: string;
  type: 'micro' | 'macro';
  tx: number;
  timestamp: number;
  secondsSince: string;
  producer?: {
    name: string;
    avatar: string;
    link: string;
  }
};

export type IExplorerTransactionItem = {
  hash: string,
  from: string,
  fromName: string,
  fromAvatar: string,
  fromLink: string,
  to: string,
  toName: string,
  toAvatar: string,
  toLink: string,
  value: number,
  fee: number,
  timestamp: number;
  link: string,
};

export type ITransactionDetailItem = {
  hash: string,
  blockNumber: number,
  from: string,
  fromName: string,
  fromAvatar: string,
  fromLink: string,
  to: string,
  toName: string,
  toAvatar: string,
  toLink: string,
  value: number,
  fee: number,
  validityStartHeight: number,
  confirmations?: number,
  datetime?: string,
  link: string,
};

export type IWalletStakerTableFilters = {
  address: string;
};

export type IWalletStakerItem = {
  address: string,
  name: string,
  avatar: string,
  addressLink: string,
  stakedNIM: number,
  shared: number,
};

export type IWalletItem = {
  account: {
    address: string,
    name: string,
    avatar: string,
    addressLink: string,
    walletBalance: number,
  },
  transactions: ITransactionDetailItem[],
  staker?: {
    stakingBalance: number,
    inactiveBalance: number,
    retiredBalance: number,
    totalBalance: number,
    shared: number,
    validatorAddress: string,
    validatorName: string,
    validatorAvatar: string,
    validatorAddressLink: string,
  },
  validator?: {
    address: string,
    name: string,
    avatar: string,
    addressLink: string,
    signingKey: string,
    votingKey: string,
    rewardAddress: string,
    rewardName: string,
    rewardAvatar: string,
    rewardAddressLink: string,
    numStakers: number,
    numStakersShare: number,
    balance: number,
    balanceShare: number,
    stakers: IWalletStakerItem[],
  }
};

export type IBlockDetailItem = {
  number: number,
  hash: string,
  type: 'micro' | 'macro',
  epoch: number,
  batch: number,
  size: number,
  datetime: string,
  txCount: number,
  txVolume: number,
  transactions: ITransactionDetailItem[],
  producer?: {
    validator: string,
    validatorName: string,
    validatorAvatar: string,
    validatorLink: string,
    slotNumber: number,
    publicKey: string,
  }
};

export type ITransactionTableFilters = {
  address: string;
};

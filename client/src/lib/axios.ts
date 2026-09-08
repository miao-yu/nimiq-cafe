import type { AxiosRequestConfig } from 'axios';

import axios from 'axios';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

const axiosInstance = axios.create({ baseURL: CONFIG.serverUrl });

export default axiosInstance;

// ----------------------------------------------------------------------

export const fetcher = async (args: string | [string, AxiosRequestConfig]) => {
  try {
    const [url, config] = Array.isArray(args) ? args : [args];

    const res = await axiosInstance.get(url, { ...config });

    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return null;
      }

      throw error;
    }

    console.error('Unexpected error:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------

export const endpoints = {
  auth: {
    me: '/api/auth/me',
    challenge: '/api/auth/challenge',
    signIn: '/api/auth/sign-in',
    signUp: '/api/auth/sign-up',
  },
  portfolio: { root: '/api/portfolio', addresses: '/api/portfolio/addresses' },
  blockchain: {
    stakedInfo: '/api/stakedinfo',
    electedValidators: '/api/elected-validators',
    dailyTransactions: '/api/daily-transactions',
    dailyStakedinfo: '/api/daily-stakedinfo',
    dailySocialmedia: '/api/daily-socialmedia',
    dailyFastspot: '/api/daily-fastspot',
    todayActiveUsers: '/api/today-active-users',
    priceInfo: '/api/price-info',
    block: '/api/block',
    tx: '/api/tx',
    wallet: '/api/wallet',
    latestBlocks: '/api/latest-blocks',
    latestTransactions: '/api/latest-txs',
    activeAccounts: '/api/active-accounts',
    settings: '/api/settings',
    pools: '/api/pools',
    supplyCurve: '/api/supply',
    calculator: '/api/calculator',
    nimPrice: '/api/nim-price',
    search: '/api/search',
  },
  poolStaker: {
    list: '/api/poolstakers',
    details: '/api/poolstakers',
    rewards: '/api/rewards',
    payouts: '/api/payouts',
    dailyRewards: '/api/dailyrewards',
    totalRewards: '/api/totalrewards',
    payoutHistory: '/api/payout-history',
    poolRewards: '/api/pool-rewards',
  },
};

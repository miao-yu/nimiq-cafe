import type { SWRConfiguration } from 'swr';
import type { IPoolItem } from 'src/types/pool';
import type { IBlockItem, IWalletItem, ISettingItem, IPriceInfoItem, IStakedInfoItem, IBlockDetailItem, ISupplyCurveItem, ITransactionItem, IActiveAccountItem, IDailyStakedinfoItem, ITodayActiveUserItem, IElectedValidatorItem, IDailyTransactionItem, IDailyFastspotInfoItem, ITransactionDetailItem, IDailySocialmediaInfoItem } from 'src/types/blockchain';

import useSWR from 'swr';
import { useMemo } from 'react';

import { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const swrOptions: SWRConfiguration = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

type StakedInfoData = IStakedInfoItem;

export function useGetStakedInfo() {
  const url = endpoints.blockchain.stakedInfo;

  const { data, isLoading, error, isValidating } = useSWR<StakedInfoData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      stakedInfo: data,
      stakedInfoLoading: isLoading,
      stakedInfoError: error,
      stakedInfoValidating: isValidating,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type ActiveAccountsData = IActiveAccountItem;

export function useGetActiveAccounts() {
  const url = endpoints.blockchain.activeAccounts;

  const { data, isLoading, error, isValidating } = useSWR<ActiveAccountsData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      activeAccounts: data,
      activeAccountsLoading: isLoading,
      activeAccountsError: error,
      activeAccountsValidating: isValidating,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type ElectedValidatorsData = IElectedValidatorItem[];

export function useGetElectedValidators() {
  const url = endpoints.blockchain.electedValidators;

  const { data, isLoading, error, isValidating } = useSWR<ElectedValidatorsData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      electedValidators: data || [],
      electedValidatorsLoading: isLoading,
      electedValidatorsError: error,
      electedValidatorsValidating: isValidating,
      electedValidatorsEmpty: !isLoading && !data?.length,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type SupplyCurveData = ISupplyCurveItem[];

export function useGetSupplyCurve() {
  const url = endpoints.blockchain.supplyCurve;

  const { data, isLoading, error, isValidating } = useSWR<SupplyCurveData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      supplyCurve: data || [],
      supplyCurveLoading: isLoading,
      supplyCurveError: error,
      supplyCurveValidating: isValidating,
      supplyCurveEmpty: !isLoading && !data?.length,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type PoolsData = IPoolItem[];

export function useGetPools() {
  const url = endpoints.blockchain.pools;

  const { data, isLoading, error, isValidating } = useSWR<PoolsData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      pools: data || [],
      poolsLoading: isLoading,
      poolsError: error,
      poolsValidating: isValidating,
      poolsEmpty: !isLoading && !data?.length,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type PoolData = IPoolItem;

export function useGetPool(address: string) {
  const url = `${endpoints.blockchain.pools}/${address}`;

  const { data, isLoading, error, isValidating } = useSWR<PoolData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      pool: data || undefined,
      poolLoading: isLoading,
      poolError: error,
      poolValidating: isValidating,
      poolEmpty: !isLoading && !data,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type DailyTransactionsData = IDailyTransactionItem;

export function useGetDailyTransactions() {
  const url = endpoints.blockchain.dailyTransactions;

  const { data, isLoading, error, isValidating } = useSWR<DailyTransactionsData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      dailyTransactions: data || null,
      dailyTransactionsLoading: isLoading,
      dailyTransactionsError: error,
      dailyTransactionsValidating: isValidating,
      dailyTransactionsEmpty: !isLoading && !data,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type PriceInfoData = IPriceInfoItem[];

export function useGetPriceInfo() {
  const url = endpoints.blockchain.priceInfo;

  const { data, isLoading, error, isValidating } = useSWR<PriceInfoData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      priceInfo: data || [],
      priceInfoLoading: isLoading,
      priceInfoError: error,
      priceInfoValidating: isValidating,
      priceInfoEmpty: !isLoading && !data?.length,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type DailyStakedinfoData = IDailyStakedinfoItem;

export function useGetDailyStakedinfo() {
  const url = endpoints.blockchain.dailyStakedinfo;

  const { data, isLoading, error, isValidating } = useSWR<DailyStakedinfoData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      dailyStakedinfo: data || null,
      dailyStakedinfoLoading: isLoading,
      dailyStakedinfoError: error,
      dailyStakedinfoValidating: isValidating,
      dailyStakedinfoEmpty: !isLoading && !data,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type DailySocialmediaInfoData = IDailySocialmediaInfoItem;

export function useGetDailySocialmediaInfo() {
  const url = endpoints.blockchain.dailySocialmedia;

  const { data, isLoading, error, isValidating } = useSWR<DailySocialmediaInfoData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      dailySocialmediaInfo: data || null,
      dailySocialmediaInfoLoading: isLoading,
      dailySocialmediaInfoError: error,
      dailySocialmediaInfoValidating: isValidating,
      dailySocialmediaInfoEmpty: !isLoading && !data,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type DailyFastspotInfoData = IDailyFastspotInfoItem[];

export function useGetDailyFastspotInfo() {
  const url = endpoints.blockchain.dailyFastspot;

  const { data, isLoading, error, isValidating } = useSWR<DailyFastspotInfoData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      dailyFastspotInfo: data || [],
      dailyFastspotInfoLoading: isLoading,
      dailyFastspotInfoError: error,
      dailyFastspotInfoValidating: isValidating,
      dailyFastspotInfoEmpty: !isLoading && !data?.length,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type TodayActiveUsersData = ITodayActiveUserItem;

export function useGetTodayActiveUsers() {
  const url = endpoints.blockchain.todayActiveUsers;

  const { data, isLoading, error, isValidating } = useSWR<TodayActiveUsersData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      todayActiveUsers: data || null,
      todayActiveUsersLoading: isLoading,
      todayActiveUsersError: error,
      todayActiveUsersValidating: isValidating,
      todayActiveUsersEmpty: !isLoading && !data,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type BlockData = IBlockDetailItem;

export function useGetBlock(blockNumber: string) {
  const url = `${endpoints.blockchain.block}/${blockNumber}`;

  const { data, isLoading, error, isValidating } = useSWR<BlockData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      block: data || null,
      blockLoading: isLoading,
      blockError: error,
      blockValidating: isValidating,
      blockEmpty: !isLoading && !data,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type TransactionData = ITransactionDetailItem;

export function useGetTransaction(hash: string) {
  const url = `${endpoints.blockchain.tx}/${hash}`;

  const { data, isLoading, error, isValidating } = useSWR<TransactionData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      transaction: data || null,
      transactionLoading: isLoading,
      transactionError: error,
      transactionValidating: isValidating,
      transactionEmpty: !isLoading && !data,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type WalletData = IWalletItem;

export function useGetWallet(address: string) {
  const url = `${endpoints.blockchain.wallet}/${address}`;

  const { data, isLoading, error, isValidating } = useSWR<WalletData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      wallet: data || null,
      walletLoading: isLoading,
      walletError: error,
      walletValidating: isValidating,
      walletEmpty: !isLoading && !data,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type LatestBlocksData = IBlockItem[];

export function useGetLatestBlocks() {
  const url = endpoints.blockchain.latestBlocks;

  const { data, isLoading, error, isValidating } = useSWR<LatestBlocksData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      latestBlocks: data || [],
      latestBlocksLoading: isLoading,
      latestBlocksError: error,
      latestBlocksValidating: isValidating,
      latestBlocksEmpty: !isLoading && !data?.length,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type LatestTransactionsData = ITransactionItem[];

export function useGetLatestTransactions() {
  const url = endpoints.blockchain.latestTransactions;

  const { data, isLoading, error, isValidating } = useSWR<LatestTransactionsData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      latestTransactions: data || [],
      latestTransactionsLoading: isLoading,
      latestTransactionsError: error,
      latestTransactionsValidating: isValidating,
      latestTransactionsEmpty: !isLoading && !data?.length,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type SettingsData = ISettingItem;

export function useGetSettings() {
  const url = endpoints.blockchain.settings;

  const { data, isLoading, error, isValidating } = useSWR<SettingsData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      settings: data || null,
      settingsLoading: isLoading,
      settingsError: error,
      settingsValidating: isValidating,
      settingsEmpty: !isLoading && !data,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

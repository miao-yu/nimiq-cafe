import type { SWRConfiguration } from 'swr';
import type { IPoolStakerItem } from 'src/types/user';
import type { IPayoutItem, IRewardItem, IPoolRewardItem, IDailyRewardsItem, ITotalRewardsItem, IPayoutHistoryItem } from 'src/types/blockchain';

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

type PoolStakersData = IPoolStakerItem[];

export function useGetPoolStakers() {
  const url = endpoints.poolStaker.list;

  const { data, isLoading, error, isValidating } = useSWR<PoolStakersData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      poolStakers: data || [],
      poolStakersLoading: isLoading,
      poolStakersError: error,
      poolStakersValidating: isValidating,
      poolStakersEmpty: !isLoading && !data?.length,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type PoolStakerData = IPoolStakerItem;

export function useGetPoolStaker(address: string) {
  const url = `${endpoints.poolStaker.details}/${address}`;

  const { data, isLoading, error, isValidating } = useSWR<PoolStakerData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      poolStaker: data || undefined,
      poolStakerLoading: isLoading,
      poolStakerError: error,
      poolStakerValidating: isValidating,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type PayoutsData = IPayoutItem[];

export function useGetPayouts(address: string) {
  const url = `${endpoints.poolStaker.payouts}/${address}`;

  const { data, isLoading, error, isValidating } = useSWR<PayoutsData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      payouts: data || [],
      payoutsLoading: isLoading,
      payoutsError: error,
      payoutsValidating: isValidating,
      payoutsEmpty: !isLoading && !data?.length,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type RewardsData = IRewardItem[];

export function useGetRewards(address: string) {
  const url = `${endpoints.poolStaker.rewards}/${address}`;

  const { data, isLoading, error, isValidating } = useSWR<RewardsData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      rewards: data || [],
      rewardsLoading: isLoading,
      rewardsError: error,
      rewardsValidating: isValidating,
      rewardsEmpty: !isLoading && !data?.length,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type DailyRewardsData = IDailyRewardsItem[];

export function useGetDailyRewards(address: string) {
  const url = `${endpoints.poolStaker.dailyRewards}/${address}`;

  const { data, isLoading, error, isValidating } = useSWR<DailyRewardsData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      dailyRewards: data || [],
      dailyRewardsLoading: isLoading,
      dailyRewardsError: error,
      dailyRewardsValidating: isValidating,
      dailyRewardsEmpty: !isLoading && !data?.length,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type TotalRewardsData = ITotalRewardsItem;

export function useGetTotalRewards(address: string) {
  const url = `${endpoints.poolStaker.totalRewards}/${address}`;

  const { data, isLoading, error, isValidating } = useSWR<TotalRewardsData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      totalRewards: data || undefined,
      totalRewardsLoading: isLoading,
      totalRewardsError: error,
      totalRewardsValidating: isValidating,
      totalRewardsEmpty: !isLoading && !data,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type PayoutHistoryData = IPayoutHistoryItem[];

export function useGetPayoutHistory() {
  const url = endpoints.poolStaker.payoutHistory;

  const { data, isLoading, error, isValidating } = useSWR<PayoutHistoryData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      payoutHistory: data || [],
      payoutHistoryLoading: isLoading,
      payoutHistoryError: error,
      payoutHistoryValidating: isValidating,
      payoutHistoryEmpty: !isLoading && !data?.length,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

type PoolRewardsData = IPoolRewardItem[];

export function useGetPoolRewards() {
  const url = endpoints.poolStaker.poolRewards;

  const { data, isLoading, error, isValidating } = useSWR<PoolRewardsData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      poolRewards: data || [],
      poolRewardsLoading: isLoading,
      poolRewardsError: error,
      poolRewardsValidating: isValidating,
      poolRewardsEmpty: !isLoading && !data?.length,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

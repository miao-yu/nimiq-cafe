import type { SWRConfiguration } from 'swr';
import type { IPortfolio } from 'src/types/portfolio';

import useSWR from 'swr';
import { useMemo } from 'react';

import axios, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const swrOptions: SWRConfiguration = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

export function useGetPortfolio() {
  const url = endpoints.portfolio.root;

  const { data, isLoading, error, isValidating, mutate } = useSWR<IPortfolio>(url, fetcher, {
    ...swrOptions,
    /**
     * A first sign-in builds a year of history in the background, in a couple
     * of seconds. Without this the page would sit on its placeholders until
     * somebody reloaded, which is a worse experience than the wait it replaced.
     * Polling stops the moment both jobs report done.
     */
    refreshInterval: (latest) =>
      latest?.backfill?.pending || latest?.backfill?.historyPending ? 3000 : 0,
  });

  return useMemo(
    () => ({
      portfolio: data,
      portfolioLoading: isLoading,
      portfolioError: error,
      portfolioValidating: isValidating,
      refreshPortfolio: mutate,
    }),
    [data, error, isLoading, isValidating, mutate]
  );
}

// ----------------------------------------------------------------------

/**
 * Follow another address. No signature: balances and rewards are public chain
 * data and this page only reads them, so proving control bought friction rather
 * than safety. Returns the address in its canonical spacing, as the server
 * parsed it.
 */
export async function addPortfolioAddress(address: string): Promise<string> {
  const res = await axios.post(endpoints.portfolio.addresses, { address });
  return res.data.address;
}

export async function removePortfolioAddress(address: string): Promise<void> {
  await axios.delete(`${endpoints.portfolio.addresses}/${encodeURIComponent(address)}`);
}

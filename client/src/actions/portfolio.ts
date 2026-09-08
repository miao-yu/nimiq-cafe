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

  const { data, isLoading, error, isValidating, mutate } = useSWR<IPortfolio>(url, fetcher, swrOptions);

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
 * Add another address. Control of it is proved the same way signing in is --
 * the caller signs a server-issued challenge with the address being added --
 * so this takes an already-signed payload rather than doing the signing here.
 */
export async function addPortfolioAddress(signed: {
  code: string;
  publicKey: string;
  signature: string;
  signer: string;
}): Promise<string> {
  const res = await axios.post(endpoints.portfolio.addresses, signed);
  return res.data.address;
}

export async function removePortfolioAddress(address: string): Promise<void> {
  await axios.delete(`${endpoints.portfolio.addresses}/${encodeURIComponent(address)}`);
}

import type { SWRConfiguration } from 'swr';
import type { INimPriceItem, ICalculatorItem } from 'src/types/calculator';

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

export function useGetCalculator() {
  const url = endpoints.blockchain.calculator;

  const { data, isLoading, error, isValidating } = useSWR<ICalculatorItem>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      calculator: data,
      calculatorLoading: isLoading,
      calculatorError: error,
      calculatorValidating: isValidating,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetNimPrice() {
  const url = endpoints.blockchain.nimPrice;

  const { data, isLoading, error, isValidating } = useSWR<INimPriceItem>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      nimPrice: data,
      nimPriceLoading: isLoading,
      nimPriceError: error,
      nimPriceValidating: isValidating,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

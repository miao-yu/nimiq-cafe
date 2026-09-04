import { useMemo, useCallback } from 'react';
import { useLocalStorage } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { calculateRewardSummary } from 'src/utils/staking-rewards';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetCalculator } from 'src/actions/calculator';

import { LoadingScreen } from 'src/components/loading-screen';

import { CalculatorForm } from '../calculator-form';
import { CalculatorResults } from '../calculator-results';

import type { CalculatorFormState } from '../calculator-form';

// ----------------------------------------------------------------------

const STORAGE_KEY = 'nimiq-cafe-calculator';

/**
 * Fields left as null fall back to whatever the API reports, so the network's
 * current staked share and NIM price track reality until the user overrides them.
 */
type StoredState = {
  stakingAmount: number;
  restake: boolean;
  poolFee: number;
  currency: string;
  circulatingSupplyStaked: number | null;
  nimPrice: number | null;
};

const defaultState: StoredState = {
  stakingAmount: 1000000,
  restake: true,
  poolFee: 1,
  currency: 'USD',
  circulatingSupplyStaked: null,
  nimPrice: null,
};

// ----------------------------------------------------------------------

export function CalculatorView() {
  const { calculator, calculatorLoading } = useGetCalculator();
  const { state, setState, setField } = useLocalStorage<StoredState>(STORAGE_KEY, defaultState);

  const currencies = useMemo(
    () => (calculator ? Object.keys(calculator.nimPrice).sort() : []),
    [calculator]
  );

  const supplyStakedOptions = useMemo(
    () =>
      calculator
        ? Array.from(new Set(calculator.circulatingSupplyStakedOptions)).sort((a, b) => a - b)
        : [],
    [calculator]
  );

  const currency = calculator && currencies.includes(state.currency) ? state.currency : 'USD';

  const formState: CalculatorFormState | null = useMemo(
    () =>
      calculator
        ? {
            stakingAmount: state.stakingAmount,
            restake: state.restake,
            poolFee: state.poolFee,
            currency,
            circulatingSupplyStaked:
              state.circulatingSupplyStaked ?? calculator.circulatingSupplyStaked,
            nimPrice:
              state.nimPrice ?? Number(calculator.nimPrice[currency] ?? calculator.currencyPrice),
          }
        : null,
    [calculator, currency, state]
  );

  const sign = calculator?.currencies[currency]?.symbol ?? '$';

  // Switching currency reprices NIM in the new currency, as the v1 page did.
  const handleChangeCurrency = useCallback(
    (nextCurrency: string) => {
      setState({
        currency: nextCurrency,
        nimPrice: Number(calculator?.nimPrice[nextCurrency] ?? 0),
      });
    },
    [calculator, setState]
  );

  const summary = useMemo(() => {
    if (!formState || !(formState.stakingAmount > 0)) return null;

    return calculateRewardSummary({
      stakingAmount: formState.stakingAmount,
      circulatingSupplyStaked: formState.circulatingSupplyStaked,
      poolFee: formState.poolFee,
      price: formState.nimPrice,
      restake: formState.restake,
    });
  }, [formState]);

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h2" component="h1" sx={{ mb: 3 }}>
        Nimiq Staking Calculator
      </Typography>

      {calculatorLoading || !formState ? (
        <LoadingScreen />
      ) : (
        <Box
          sx={{
            gap: 3,
            display: 'grid',
            alignItems: 'flex-start',
            gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' },
          }}
        >
          <CalculatorForm
            state={formState}
            sign={sign}
            currencies={currencies}
            supplyStakedOptions={supplyStakedOptions}
            onChangeField={setField}
            onChangeCurrency={handleChangeCurrency}
          />

          {summary ? (
            <CalculatorResults
              summary={summary}
              sign={sign}
              stakingAmount={formState.stakingAmount}
            />
          ) : (
            <Alert severity="info">Enter a staking amount to see the estimated rewards.</Alert>
          )}
        </Box>
      )}
    </DashboardContent>
  );
}

import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';

import { fNumber, fShortenNumber } from 'src/utils/format-number';

import { useGetTotalRewards } from 'src/actions/pool';
import { useGetPriceInfo } from 'src/actions/blockchain';
import AppWidgetSimplePlaceholder from 'src/placeholders/app-widget-simple-placeholder';

import { AppWidgetSimple } from './app-widget-simple';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  address: string;
};

export function TotalRewards({
  title,
  subheader,
  sx,
  address,
  ...other
}: Props) {

  const { totalRewards, totalRewardsLoading } = useGetTotalRewards(address);
  const { priceInfo } = useGetPriceInfo();
  const latestPriceInfo = priceInfo[priceInfo.length - 1];

  if (totalRewardsLoading) {
    return (
      <Box
        sx={{
          gap: 3,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
        }}
      >
        {getAppWidgetSimplePlaceholderCards(4)}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        gap: 3,
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
      }}
    >
      <AppWidgetSimple
        title="Lifetime Rewards"
        text={`${fShortenNumber(totalRewards?.totalRewards || 0).toUpperCase()} $NIM`}
        extraText={fNumber((totalRewards?.totalRewards || 0) * latestPriceInfo?.price, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).toUpperCase()}
        color="error"
      />

      <AppWidgetSimple
        title="Today's Rewards"
        text={`${fShortenNumber(totalRewards?.todayRewards || 0).toUpperCase()} $NIM`}
        extraText={fNumber((totalRewards?.todayRewards || 0) * latestPriceInfo?.price, { style: 'currency', currency: 'USD', maximumFractionDigits: 4 }).toUpperCase()}
        color="primary"
      />

      <AppWidgetSimple
        title="30-Day Rewards"
        text={`${fShortenNumber(totalRewards?.last30DaysRewards || 0).toUpperCase()} $NIM`}
        extraText={fNumber((totalRewards?.last30DaysRewards || 0) * latestPriceInfo?.price, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).toUpperCase()}
        color="secondary"
      />

      <AppWidgetSimple
        title="Pending Payout"
        text={`${(fNumber(totalRewards?.pendingPayout) || 0).toString().toUpperCase()} $NIM`}
        extraText={fNumber((totalRewards?.pendingPayout || 0) * latestPriceInfo?.price, { style: 'currency', currency: 'USD', maximumFractionDigits: 6 }).toUpperCase()}
        color="secondary"
      />
    </Box>
  );
}

export function getAppWidgetSimplePlaceholderCards(number: number): JSX.Element[] {
  return Array.from({ length: number }, (_, index) => (
    <AppWidgetSimplePlaceholder key={index} />
  ));
}

import type { CardProps } from '@mui/material/Card';
import type { IPortfolioHistoryPoint } from 'src/types/portfolio';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { fNumber, fCurrency, fShortenNumber } from 'src/utils/format-number';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  history: IPortfolioHistoryPoint[];
  /** Plot fiat instead of NIM. Only offered when every point has a price. */
  currency?: 'NIM' | 'USD';
};

/**
 * Value over time.
 *
 * The chain cannot answer "what was this worth last month", so this plots the
 * daily snapshots recorded by scripts/storePortfolioSnapshots.js and nothing
 * else. A new address therefore has an empty chart until the cron has run for
 * it a few times, which is a real state and is labelled rather than hidden.
 */
export function PortfolioValue({ title, subheader, history, currency = 'NIM', sx, ...other }: Props) {
  const usable = currency === 'USD' ? history.filter((point) => point.nimUsd !== null) : history;

  const toValue = (point: IPortfolioHistoryPoint) => {
    const nim = point.liquid + point.staked + point.inactive + point.retired;
    return currency === 'USD' ? nim * (point.nimUsd ?? 0) : nim;
  };

  const chartOptions = useChart({
    xaxis: { categories: usable.map((point) => point.date), type: 'category' },
    yaxis: {
      labels: {
        formatter: (value: number) =>
          currency === 'USD' ? fCurrency(value) : fShortenNumber(value).toUpperCase(),
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) =>
          currency === 'USD' ? fCurrency(value) : `${fNumber(value)} NIM`,
      },
    },
  });

  const renderEmpty = () => (
    <Box sx={{ px: 3, pb: 3, pt: 1 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {history.length === 0
          ? 'Nothing recorded yet. Balances are snapshotted once a day, so this chart fills in from tomorrow.'
          : 'Not enough days recorded yet to draw a trend.'}
      </Typography>
    </Box>
  );

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} />

      {usable.length < 2 ? (
        renderEmpty()
      ) : (
        <Chart
          type="area"
          series={[
            {
              name: currency === 'USD' ? 'Value' : 'Total NIM',
              data: usable.map(toValue),
            },
          ]}
          options={chartOptions}
          sx={{ py: 2.5, pl: 1, pr: 2.5, height: 320 }}
        />
      )}
    </Card>
  );
}

import type { CardProps } from '@mui/material/Card';
import type { IPortfolioHistoryPoint } from 'src/types/portfolio';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fNumber, fCurrency, fShortenNumber } from 'src/utils/format-number';

import { Chart, useChart } from 'src/components/chart';

import { withinRange, toUsdSeries, formatRangeDate, PORTFOLIO_RANGES } from './portfolio-range';

import type { PortfolioRange } from './portfolio-range';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  history: IPortfolioHistoryPoint[];
  range: PortfolioRange;
  onRangeChange: (range: PortfolioRange) => void;
  /** Used for days whose price was not recorded. */
  nimUsd: number | null;
};

/**
 * Value over time, in fiat.
 *
 * The chain cannot answer "what was this worth last month", so this plots the
 * daily snapshots recorded by scripts/storePortfolioSnapshots.js and nothing
 * else. A new address therefore has an empty chart until the cron has run for
 * it a few times, which is a real state and is labelled rather than hidden.
 *
 * The range picked here also drives the Balance Change and Rewards figures
 * above, which is why it is owned by the view rather than by this card.
 */
export function PortfolioValue({
  title,
  subheader,
  history,
  range,
  onRangeChange,
  nimUsd,
  sx,
  ...other
}: Props) {
  const series = toUsdSeries(withinRange(history, range), nimUsd);

  const chartOptions = useChart({
    xaxis: {
      categories: series.map((point) => formatRangeDate(point.date, range)),
      type: 'category',
      // A year of daily points cannot show a label per day; let ApexCharts
      // thin them rather than overlapping into mush.
      tickAmount: Math.min(series.length, 8),
    },
    yaxis: { labels: { formatter: (value: number) => fShortenNumber(value).toUpperCase() } },
    tooltip: {
      y: {
        formatter: (value: number, opts?: { dataPointIndex: number }) => {
          const point = opts ? series[opts.dataPointIndex] : undefined;

          return point ? `${fCurrency(value)}  ·  ${fNumber(point.nim)} NIM` : fCurrency(value);
        },
      },
    },
  });

  const renderRanges = () => (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={range}
      onChange={(_, next) => {
        // null when the active button is clicked again -- keep the range.
        if (next) {
          onRangeChange(next as PortfolioRange);
        }
      }}
      sx={{ border: 0, flexWrap: 'wrap' }}
    >
      {PORTFOLIO_RANGES.map((option) => (
        <ToggleButton
          key={option}
          value={option}
          sx={{ border: 0, borderRadius: 1, px: 1.25, typography: 'caption', fontWeight: 600 }}
        >
          {option}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} action={renderRanges()} />

      {series.length < 2 ? (
        <Box sx={{ px: 3, pb: 3, pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {history.length === 0
              ? 'Nothing recorded yet. Balances are snapshotted once a day, so this chart fills in from tomorrow.'
              : 'Not enough days in this range yet to draw a trend.'}
          </Typography>
        </Box>
      ) : (
        <Chart
          type="area"
          series={[{ name: 'Value', data: series.map((point) => point.usd) }]}
          options={chartOptions}
          sx={{ py: 2.5, pl: 1, pr: 2.5, height: 320 }}
        />
      )}
    </Card>
  );
}

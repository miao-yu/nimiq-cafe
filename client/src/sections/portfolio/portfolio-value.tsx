import type { CardProps } from '@mui/material/Card';
import type { IPortfolioHistoryPoint } from 'src/types/portfolio';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { Chart, useChart } from 'src/components/chart';

import { PortfolioRangeToggle } from './portfolio-range-toggle';
import {
  withinRange,
  toUsdSeries,
  formatUsdAxis,
  formatNimShort,
  formatUsdExact,
  formatRangeDate,
} from './portfolio-range';

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
  /** True while past balances are still being reconstructed. */
  building?: boolean;
  /**
   * The reconstruction was refused: this address has more transactions than the
   * chain will return in one request, so walking its balance backwards would
   * have drifted. Nothing to show but the days recorded from here on.
   */
  unreconstructable?: boolean;
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
  building,
  unreconstructable,
  sx,
  ...other
}: Props) {
  const inRange = withinRange(history, range);
  const series = toUsdSeries(inRange, nimUsd);

  // Only worth saying when the visible window actually contains derived days.
  const derived = inRange.filter((point) => point.reconstructed).length;

  const chartOptions = useChart({
    xaxis: {
      categories: series.map((point) => formatRangeDate(point.date, range)),
      type: 'category',
      // A year of daily points cannot show a label per day; let ApexCharts
      // thin them rather than overlapping into mush.
      tickAmount: Math.min(series.length, 8),
    },
    yaxis: { labels: { formatter: (value: number) => formatUsdAxis(value) } },
    tooltip: {
      y: {
        formatter: (value: number, opts?: { dataPointIndex: number }) => {
          const point = opts ? series[opts.dataPointIndex] : undefined;

          return point
            ? `${formatUsdExact(value)}  ·  ${formatNimShort(point.nim)}`
            : formatUsdExact(value);
        },
      },
    },
  });

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={title}
        subheader={
          unreconstructable && derived
            ? `Only the last ${derived} ${derived === 1 ? 'day' : 'days'} could be reconstructed — too many transactions to go further back`
            : derived
              ? `${derived} earlier ${derived === 1 ? 'day' : 'days'} reconstructed from on-chain activity`
              : subheader
        }
        action={<PortfolioRangeToggle value={range} onChange={onRangeChange} />}
      />

      {series.length < 2 ? (
        <Box sx={{ px: 3, pb: 3, pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {building
              ? 'Reconstructing your balance history from the chain. This takes a few seconds.'
              : unreconstructable && history.length < 2
                ? 'Your rewards arrive as thousands of small payouts, which is more transactions than the chain hands back in one request, so only the most recent days could be worked out. The chart fills in a day at a time from here.'
                : history.length === 0
                  ? 'Nothing recorded yet. Balances are snapshotted once a day, so this fills in overnight.'
                  : 'Not enough days in this range yet to draw a trend.'}
          </Typography>

          {building && <LinearProgress sx={{ mt: 2, maxWidth: 240 }} />}
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

import type { CardProps } from '@mui/material/Card';
import type { IPortfolioRewards } from 'src/types/portfolio';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { fNumber, fShortenNumber } from 'src/utils/format-number';

import { Chart, useChart } from 'src/components/chart';

import { withinRange, formatDayLabel } from './portfolio-range';
import { PortfolioRangeToggle } from './portfolio-range-toggle';

import type { PortfolioRange } from './portfolio-range';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  rewards: IPortfolioRewards;
  /** True while the backfill has yet to reach every address. */
  pending?: boolean;
  /**
   * No reward history is obtainable: the stake sits with another validator that
   * pays out rather than compounds, so nothing was restaked to read.
   */
  unavailable?: boolean;
  /** Shared with the value chart and the stat cards -- one window per page. */
  range: PortfolioRange;
  onRangeChange: (range: PortfolioRange) => void;
};

export function PortfolioRewards({
  title,
  subheader,
  rewards,
  pending,
  unavailable,
  range,
  onRangeChange,
  sx,
  ...other
}: Props) {
  const daily = withinRange(rewards.daily, range);

  const chartOptions = useChart({
    xaxis: {
      // "2026-09-08" is too wide to repeat across an axis, and the year is the
      // same on every tick anyway.
      categories: daily.map((day) => formatDayLabel(day.date)),
      type: 'category',
      tickAmount: Math.min(daily.length, 8),
    },
    yaxis: { labels: { formatter: (value: number) => fShortenNumber(value).toUpperCase() } },
    tooltip: { y: { formatter: (value: number) => `${fNumber(value)} NIM` } },
  });

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={title}
        subheader={subheader}
        action={<PortfolioRangeToggle value={range} onChange={onRangeChange} />}
      />

      {daily.length < 2 ? (
        <Box sx={{ px: 3, pb: 3, pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {pending
              ? 'Gathering your reward history from the chain. This takes a few seconds.'
              : unavailable
                ? 'Your validator pays rewards out as transfers rather than compounding them into your stake. Only compounded rewards leave a record on chain that we can read back, so there is no history to chart here. Stakers with us get a full daily record.'
                : 'No rewards recorded in this range yet.'}
          </Typography>

          {pending && <LinearProgress sx={{ mt: 2, maxWidth: 240 }} />}
        </Box>
      ) : (
        <Chart
          type="bar"
          series={[{ name: 'Rewards', data: daily.map((day) => day.rewards) }]}
          options={chartOptions}
          sx={{ py: 2.5, pl: 1, pr: 2.5, height: 320 }}
        />
      )}
    </Card>
  );
}

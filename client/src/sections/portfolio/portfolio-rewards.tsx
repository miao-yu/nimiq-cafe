import type { CardProps } from '@mui/material/Card';
import type { IPortfolioRewards } from 'src/types/portfolio';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { fNumber } from 'src/utils/format-number';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  rewards: IPortfolioRewards;
};

/** Tier 3 only: this history exists because the pool records it per staker. */
export function PortfolioRewards({ title, subheader, rewards, sx, ...other }: Props) {
  const chartOptions = useChart({
    xaxis: { categories: rewards.daily.map((day) => day.date), type: 'category' },
    yaxis: { labels: { formatter: (value: number) => fNumber(value) } },
    tooltip: { y: { formatter: (value: number) => `${fNumber(value)} NIM` } },
  });

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} />

      {rewards.daily.length < 2 ? (
        <Box sx={{ px: 3, pb: 3, pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Rewards start appearing here once your stake has been through a few payout cycles.
          </Typography>
        </Box>
      ) : (
        <Chart
          type="bar"
          series={[{ name: 'Rewards', data: rewards.daily.map((day) => day.rewards) }]}
          options={chartOptions}
          sx={{ py: 2.5, pl: 1, pr: 2.5, height: 320 }}
        />
      )}
    </Card>
  );
}

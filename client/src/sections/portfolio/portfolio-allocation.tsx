import type { CardProps } from '@mui/material/Card';
import type { IPortfolio } from 'src/types/portfolio';
import type { ChartOptions } from 'src/components/chart';

import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { fNumber, fShortenNumber } from 'src/utils/format-number';

import { Chart, useChart, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  totals: IPortfolio['totals'];
};

/**
 * Where the NIM actually sits. This is the one chart that works for everybody
 * on day one -- it reads current chain state, so it needs no history.
 */
export function PortfolioAllocation({ title, subheader, totals, sx, ...other }: Props) {
  const theme = useTheme();

  // Zero slices are dropped rather than drawn as invisible wedges, which
  // otherwise clutter the legend for the common case of "all liquid".
  const series = [
    { label: 'Liquid', value: totals.liquid },
    { label: 'Staked', value: totals.staked },
    { label: 'Inactive', value: totals.inactive },
    { label: 'Retired', value: totals.retired },
  ].filter((slice) => slice.value > 0);

  const chartColors = [
    theme.palette.info.main,
    theme.palette.primary.main,
    theme.palette.warning.main,
    theme.palette.error.main,
  ].slice(0, series.length || 1);

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: chartColors,
    labels: series.map((item) => item.label),
    stroke: { width: 0 },
    tooltip: {
      y: {
        formatter: (value: number) => `${fNumber(value)} NIM`,
        title: { formatter: (seriesName: string) => `${seriesName}` },
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            // Compact in the centre, where there is no room; the tooltip
            // above keeps the exact figure.
            value: { formatter: (value: number | string) => fShortenNumber(value).toUpperCase() },
            total: { formatter: () => fShortenNumber(totals.total).toUpperCase() },
          },
        },
      },
    },
  } as ChartOptions);

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} />

      <Chart
        type="donut"
        series={series.length ? series.map((item) => item.value) : [1]}
        options={chartOptions}
        sx={{ my: 6, mx: 'auto', width: { xs: 220 }, height: { xs: 220 } }}
      />

      <Divider sx={{ borderStyle: 'dashed' }} />

      <ChartLegends
        labels={chartOptions?.labels}
        colors={chartOptions?.colors}
        sx={{ p: 3, justifyContent: 'center' }}
      />
    </Card>
  );
}

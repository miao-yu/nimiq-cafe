import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';

import { useTheme } from '@mui/material/styles';

import { fBytes } from 'src/utils/format-blockchain';
import { fNumber, fShortenNumber } from 'src/utils/format-number';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  column: string;
  chart: {
    colors?: string[];
    categories: string[];
    series: number[];
    options?: ChartOptions;
  };
};

export function BlockchainRealtimeChart({ column, chart }: Props) {
  const theme = useTheme();

  const chartColors = chart.colors ?? [theme.palette.primary.light, theme.palette.primary.main];

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: [chartColors[1]],
    xaxis: { categories: chart.categories },
    grid: {
      padding: {
        top: 6,
        left: 6,
        right: 6,
        bottom: 6,
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        colorStops: [
          { offset: 0, color: chartColors[0], opacity: 1 },
          { offset: 100, color: chartColors[1], opacity: 1 },
        ],
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) => {
          if (column === 'blockSize') {
            return fBytes(value);
          } else if (column === 'txVolume') {
            return `${fShortenNumber(value).toUpperCase()} $NIM`;
          } else if (column === 'txCount') {
            return fNumber(value);
          }

          return fNumber(value);
        },
        title: { formatter: () => '' }
      },
    },
    ...chart.options,
  });

  return (
    <Chart
      type="line"
      series={[{ data: chart.series }]}
      options={chartOptions}
      sx={{ width: 100, height: 66 }}
    />
  );
}

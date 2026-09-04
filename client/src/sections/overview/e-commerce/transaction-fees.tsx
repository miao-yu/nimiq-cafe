import type { CardProps } from '@mui/material/Card';

import { useState, useCallback } from 'react';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { fNumber, fShortenNumber } from 'src/utils/format-number';

import { Chart, useChart, ChartSelect } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  data: number[];
  categories: string[];
  colors?: string[];
};

export function TransactionFees({ title, subheader, data, categories, colors, sx, ...other }: Props) {
  const theme = useTheme();

  const [selectedSeries, setSelectedSeries] = useState('Daily');

  const series = [
    {
      name: 'Daily',
      data: [{ data }],
      categories,
    },
  ];

  const currentSeries = series.find((i) => i.name === selectedSeries);

  const chartColors = colors || [theme.palette.text.primary];

  const chartOptions = useChart({
    grid: { padding: { left: 24 } },
    stroke: { width: 3 },
    colors: chartColors,
    xaxis: { categories: currentSeries?.categories, labels: { show: false } },
    yaxis: {
      labels: {
        formatter: (value) => `${fShortenNumber(value).toUpperCase()}`,
      },
    },
    tooltip: { y: { formatter: (value: number) => `${fNumber(value)} $NIM`, title: { formatter: () => '' } } },
  });

  const handleChangeSeries = useCallback((newValue: string) => {
    setSelectedSeries(newValue);
  }, []);

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={title}
        subheader={subheader}
        action={
          <ChartSelect
            options={series.map((item) => item.name)}
            value={selectedSeries}
            onChange={handleChangeSeries}
          />
        }
        sx={{ mb: 3 }}
      />

      <Chart
        type="line"
        series={currentSeries?.data}
        options={chartOptions}
        slotProps={{ loading: { p: 2.5 } }}
        sx={{
          pl: 1,
          py: 2.5,
          pr: 2.5,
          height: 282,
        }}
      />
    </Card>
  );
}

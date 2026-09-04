import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';

import { useState, useCallback } from 'react';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { fShortenNumber } from 'src/utils/format-number';

import { Chart, useChart, ChartSelect, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  chart: {
    colors?: string[];
    categories: string[];
    series: {
      name: string;
      data: {
        name: string;
        data: number[];
      }[];
    }[];
    options?: ChartOptions;
  };
};

export function AppAreaInstalled({ title, subheader, chart, sx, ...other }: Props) {
  const theme = useTheme();

  const [selectedSeries, setSelectedSeries] = useState('Daily');

  const chartColors = chart.colors ?? [
    theme.palette.primary.dark,
    theme.palette.secondary.dark,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
  ];

  const chartOptions = useChart({
    chart: { stacked: true },
    colors: chartColors,
    stroke: { width: 0 },
    xaxis: { categories: chart.categories },
    tooltip: { y: { formatter: (value: number) => fShortenNumber(value, { style: 'currency', currency: 'USD' }).toUpperCase() } },
    plotOptions: { bar: { columnWidth: '40%' } },
    ...chart.options,
  });

  const handleChangeSeries = useCallback((newValue: string) => {
    setSelectedSeries(newValue);
  }, []);

  const currentSeries = chart.series.find((i) => i.name === selectedSeries);

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={title}
        subheader={subheader}
        action={
          <ChartSelect
            options={chart.series.map((item) => item.name)}
            value={selectedSeries}
            onChange={handleChangeSeries}
          />
        }
        sx={{ mb: 3 }}
      />

      <ChartLegends
        colors={chartOptions?.colors}
        labels={chart.series[0].data.map((item) => item.name)}
        values={[
          fShortenNumber(chart.series[0].data[0].data.reduce((acc, volume) => acc + volume, 0) || 0, { style: 'currency', currency: 'USD' }).toUpperCase(), 
          fShortenNumber(chart.series[0].data[1].data.reduce((acc, volume) => acc + volume, 0) || 0, { style: 'currency', currency: 'USD' }).toUpperCase(), 
          fShortenNumber(chart.series[0].data[2].data.reduce((acc, volume) => acc + volume, 0) || 0, { style: 'currency', currency: 'USD' }).toUpperCase(), 
          fShortenNumber(chart.series[0].data[3].data.reduce((acc, volume) => acc + volume, 0) || 0, { style: 'currency', currency: 'USD' }).toUpperCase(),
          fShortenNumber(chart.series[0].data[4].data.reduce((acc, volume) => acc + volume, 0) || 0, { style: 'currency', currency: 'USD' }).toUpperCase()
        ]}
        sx={{ px: 3, gap: 3 }}
      />

      <Chart
        key={selectedSeries}
        type="bar"
        series={currentSeries?.data}
        options={chartOptions}
        slotProps={{ loading: { p: 2.5 } }}
        sx={{
          pl: 1,
          py: 2.5,
          pr: 2.5,
          height: 350,
        }}
      />
    </Card>
  );
}

import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';

import { useState, useCallback } from 'react';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { Chart, useChart, ChartSelect, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  chart: {
    height?: number;
    colors?: string[];
    categories?: string[];
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

export function EcommerceYearlySales({ title, subheader, chart, sx, ...other }: Props) {
  const theme = useTheme();

  const [selectedSeries, setSelectedSeries] = useState('Daily');

  const chartColors = chart.colors ?? [theme.palette.primary.main, theme.palette.warning.main];

  const chartOptions = useChart({
    colors: chartColors,
    xaxis: { categories: chart.categories, labels: { show: false }},
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
        sx={{ px: 3, gap: 3 }}
      />

      <Chart
        type="area"
        series={currentSeries?.data}
        options={chartOptions}
        slotProps={{ loading: { p: 2.5 } }}
        sx={{
          pl: 1,
          py: 2.5,
          pr: 2.5,
          height: chart.height || 370,
        }}
      />
    </Card>
  );
}

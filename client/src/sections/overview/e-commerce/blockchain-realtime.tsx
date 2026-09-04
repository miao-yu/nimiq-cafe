import type { CardProps } from '@mui/material/Card';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';

import { BlockchainRealtimeChart } from './blockchain-realtime-chart';
import { BlockchainRealtimeNumber } from './blockchain-realtime-number';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  column: string;
  colors?: string[];
  labels: string[];
  data: {
    date: string;
    value: number;
  }[]
};

export function BlockchainRealtime({ title, column, colors, labels, data }: Props) {
  const theme = useTheme();
  
  const chartColors = colors ?? [theme.palette.primary.light, theme.palette.primary.main];

  return (
    <Card
      sx={[{ p: 3, display: 'flex', alignItems: 'center' }]}
    >
      <BlockchainRealtimeNumber
        title={title}
        column={column}
      />

      <BlockchainRealtimeChart
        column={column}
        chart={{
          colors: chartColors,
          categories: labels,
          series: data.map((element) => element.value),
        }}
      />
    </Card>
  );
}

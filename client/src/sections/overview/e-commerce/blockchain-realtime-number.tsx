import type { CardProps } from '@mui/material/Card';
import type { IBlockItem } from 'src/types/blockchain';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { fBytes } from 'src/utils/format-blockchain';
import { fNumber, fPercent, fShortenNumber } from 'src/utils/format-number';

import { useWebSocketData } from 'src/contexts/websocket';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  column: string;
  percent?: number;
};

export function BlockchainRealtimeNumber({ title, column, percent }: Props) {
  const theme = useTheme();

  const [block, setBlock] = useState<IBlockItem>({
    epoch: 0,
    batch: 0,
    blockNumber: 0,
    type: 'micro',
    producer: null,
    size: 0,
    transactions: [],
    timestamp: new Date().getTime(),
  });

  const webSocketData = useWebSocketData();

  if (webSocketData && webSocketData.event === 'newBlock') {
    setBlock(webSocketData.data);
  }

  let text = '0';
  if (column === 'blockSize') {
    text = fBytes(block.size);
  } else if (column === 'txVolume') {
    const txVolume = block.transactions.reduce((acc, tx) => acc + (tx.value / 100000), 0);
    
    text = `${fShortenNumber(txVolume).toUpperCase()} $NIM`;
  } else if (column === 'txCount') {
    text = fNumber(block.transactions.length);
  }

  const renderTrending = () => (
    <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center' }}>
      <Box
        component="span"
        sx={{
          width: 24,
          height: 24,
          display: 'flex',
          borderRadius: '50%',
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: varAlpha(theme.vars.palette.success.mainChannel, 0.16),
          color: 'success.dark',
          ...theme.applyStyles('dark', {
            color: 'success.light',
          }),
          ...(percent !== undefined && percent < 0 && {
            bgcolor: varAlpha(theme.vars.palette.error.mainChannel, 0.16),
            color: 'error.dark',
            ...theme.applyStyles('dark', {
              color: 'error.light',
            }),
          }),
        }}
      >
        <Iconify
          width={16}
          icon={percent !== undefined && percent < 0 ? 'eva:trending-down-fill' : 'eva:trending-up-fill'}
        />
      </Box>

      <Box component="span" sx={{ typography: 'subtitle2' }}>
        {percent !== undefined && percent > 0 && '+'}
        {fPercent(percent)}
      </Box>

      <Box component="span" sx={{ color: 'text.secondary', typography: 'body2' }}>
        last day
      </Box>
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ typography: 'subtitle2' }}>{title}</Box>

      <Box sx={{ my: 1.5, typography: 'h3' }}>{text}</Box>

      {percent !== undefined && renderTrending()}
    </Box>
  );
}

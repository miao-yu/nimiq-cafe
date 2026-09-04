import type { CardProps } from '@mui/material/Card';
import type { PaletteColorKey } from 'src/theme/core';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  text: string;
  color?: PaletteColorKey;
};

export function BlockchainRealtimeSimple({ title, text, color = 'primary' }: Props) {
  return (
    <Card
      sx={[
        () => ({
          p: 3,
          display: 'flex',
          zIndex: 'unset',
          overflow: 'unset',
          alignItems: 'center',
        }),
      ]}
    >
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ typography: 'subtitle2' }}>{title}</Box>

        <Box sx={{ mt: 1.5, mb: 1, typography: 'h3' }}>{text}</Box>
      </Box>
    </Card>
  );
}

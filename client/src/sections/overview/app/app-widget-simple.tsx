import type { CardProps } from '@mui/material/Card';
import type { PaletteColorKey } from 'src/theme/core';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';

import { Iconify } from 'src/components/iconify';
import CopyToClipboard from 'src/components/utils/copy-to-clipboard';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  text: string;
  extraText?: string;
  color?: PaletteColorKey;
  copy?: boolean;
  textToCopy?: string | number;
};

export function AppWidgetSimple({ title, text, extraText, color = 'primary', copy = false, textToCopy }: Props) {
  const renderTrending = () => (
    <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center' }}>
      <Iconify
        width={16}
        icon='solar:double-alt-arrow-up-bold-duotone'
      />

      <Box component="span" sx={{ typography: 'subtitle2' }}>
        {extraText}
      </Box>
    </Box>
  );

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

        <Box sx={{ mt: 1.5, mb: 1, typography: 'h3' }}>
          {text}
          {copy && (
            <Box component="span">
              <CopyToClipboard title={title} text={textToCopy?.toString() || text} />
            </Box>
            )
          }
        </Box>

        {extraText !== undefined && renderTrending()}
      </Box>
    </Card>
  );
}

import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  /** The fiat figure. What someone is actually here to read. */
  primary: string;
  /** The NIM behind it, kept because this is still a NIM product. */
  secondary?: string;
  /** Signed figures colour and take an arrow; null leaves it plain. */
  direction?: 'up' | 'down' | null;
  note?: string;
};

/**
 * A headline figure with its NIM equivalent underneath.
 *
 * Not AppWidgetSimple: that renders its second line with a hard-coded upward
 * arrow, which is wrong for a plain NIM amount and actively misleading on a
 * balance change that went down.
 */
export function PortfolioStat({
  title,
  primary,
  secondary,
  direction = null,
  note,
  sx,
  ...other
}: Props) {
  const color =
    direction === 'up' ? 'success.main' : direction === 'down' ? 'error.main' : 'text.primary';

  return (
    <Card
      sx={[
        { p: 3, display: 'flex', alignItems: 'center', zIndex: 'unset', overflow: 'unset' },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Box sx={{ typography: 'subtitle2', color: 'text.secondary' }}>{title}</Box>

        <Box sx={{ mt: 1.5, mb: 0.5, typography: 'h3', color, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {direction && (
            <Iconify
              width={22}
              icon={
                direction === 'up'
                  ? 'solar:alt-arrow-up-bold-duotone'
                  : 'solar:alt-arrow-down-bold-duotone'
              }
            />
          )}
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {primary}
          </Box>
        </Box>

        {secondary && (
          <Box sx={{ typography: 'body2', color: 'text.secondary' }}>{secondary}</Box>
        )}

        {note && (
          <Box sx={{ mt: 0.5, typography: 'caption', color: 'text.disabled' }}>{note}</Box>
        )}
      </Box>
    </Card>
  );
}

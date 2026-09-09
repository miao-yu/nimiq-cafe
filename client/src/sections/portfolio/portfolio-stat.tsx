import type { CardProps } from '@mui/material/Card';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';

import { fPercent } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  /** The fiat figure. What someone opens this page to read. */
  primary: string;
  /**
   * A signed percentage, rendered as the same trending badge the Network
   * page's Price card uses. Mutually exclusive with `secondary` in practice --
   * a card shows one supporting line, not two.
   */
  percent?: number;
  /** Muted text after the badge, where the Price card says "last day". */
  percentNote?: string;
  /** A plain supporting line, for cards with no percentage to show. */
  secondary?: string;
  note?: string;
};

/**
 * A headline figure with one supporting line.
 *
 * Follows the Price card on /network: title in subtitle2, value in h3 and
 * uncoloured, and the sign carried by a coloured badge underneath rather than
 * by the number itself. Not AppWidgetSimple, which renders its second line with
 * a hard-coded upward arrow -- wrong for a plain NIM amount and actively
 * misleading on a change that went down.
 */
export function PortfolioStat({
  title,
  primary,
  percent,
  percentNote,
  secondary,
  note,
  sx,
  ...other
}: Props) {
  const theme = useTheme();
  const negative = percent !== undefined && percent < 0;

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
          ...theme.applyStyles('dark', { color: 'success.light' }),
          ...(negative && {
            bgcolor: varAlpha(theme.vars.palette.error.mainChannel, 0.16),
            color: 'error.dark',
            ...theme.applyStyles('dark', { color: 'error.light' }),
          }),
        }}
      >
        <Iconify width={16} icon={negative ? 'eva:trending-down-fill' : 'eva:trending-up-fill'} />
      </Box>

      <Box component="span" sx={{ typography: 'subtitle2' }}>
        {percent !== undefined && percent > 0 && '+'}
        {fPercent(percent)}
      </Box>

      {percentNote && (
        <Box component="span" sx={{ color: 'text.secondary', typography: 'body2' }}>
          {percentNote}
        </Box>
      )}
    </Box>
  );

  return (
    <Card
      sx={[
        { p: 3, display: 'flex', alignItems: 'center' },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Box sx={{ typography: 'subtitle2' }}>{title}</Box>

        <Box sx={{ my: 1.5, typography: 'h3' }}>{primary}</Box>

        {percent !== undefined && renderTrending()}

        {percent === undefined && secondary && (
          <Box sx={{ typography: 'body2', color: 'text.secondary' }}>{secondary}</Box>
        )}

        {note && <Box sx={{ mt: 0.5, typography: 'caption', color: 'text.disabled' }}>{note}</Box>}
      </Box>
    </Card>
  );
}

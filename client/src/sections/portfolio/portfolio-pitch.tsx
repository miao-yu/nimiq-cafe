import type { CardProps } from '@mui/material/Card';
import type { IPortfolioPitch } from 'src/types/portfolio';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { fPercent, fShortenNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = CardProps & {
  pitch: IPortfolioPitch;
};

/**
 * What tier 2 sees where tier 3 sees reward history.
 *
 * There is no honest way to show someone their earnings at another validator --
 * that data lives in that pool, not here. So rather than an empty chart, this
 * says plainly what is missing and why, and compares the one thing that can be
 * compared fairly: the fee.
 */
export function PortfolioPitch({ pitch, sx, ...other }: Props) {
  const cheaper = pitch.feeDifference !== null && pitch.feeDifference > 0;

  return (
    <Card sx={[{ p: 3 }, ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Iconify width={24} icon="solar:chart-square-bold-duotone" />
          <Typography variant="h6">Your reward history lives with your validator</Typography>
        </Box>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          You are staking {fShortenNumber(pitch.totalStaked).toUpperCase()} NIM, but not with us — so we have no
          per-day reward record to chart for you. Stakers here get daily rewards, payout history
          and realised returns on this page.
        </Typography>

        <Box
          sx={{
            p: 2,
            gap: 2,
            borderRadius: 1.5,
            display: 'flex',
            flexWrap: 'wrap',
            bgcolor: 'background.neutral',
          }}
        >
          {pitch.current.map((entry) => (
            <Box key={entry.address} sx={{ minWidth: 160 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {entry.validatorName}
              </Typography>
              <Typography variant="subtitle1">
                {entry.fee === null ? 'Fee unknown' : `${fPercent(entry.fee * 100)} fee`}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {fShortenNumber(entry.staked).toUpperCase()} NIM staked
              </Typography>
            </Box>
          ))}

          <Box sx={{ minWidth: 160 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              NimiqCafe
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'success.main' }}>
              {fPercent(pitch.ourFee * 100)} fee
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              payouts every minute
            </Typography>
          </Box>
        </Box>

        {cheaper && (
          <Typography variant="body2">
            That is {fPercent((pitch.feeDifference ?? 0) * 100)} of every reward you are currently
            paying away in fees.
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button component={RouterLink} href="/staking" variant="contained" color="primary">
            Stake with us
          </Button>
          <Button component={RouterLink} href="/pools" variant="outlined" color="inherit">
            Compare every pool
          </Button>
        </Box>
      </Stack>
    </Card>
  );
}

import type { IPoolItem } from 'src/types/pool';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';

import { RouterLink } from 'src/routes/components/router-link';

import { fNumber, fPercent, fShortenNumber } from 'src/utils/format-number';
import { fShortenString, fCapitalizeString } from 'src/utils/format-blockchain';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Markdown } from 'src/components/markdown';
import CopyToClipboard from 'src/components/utils/copy-to-clipboard';

// ----------------------------------------------------------------------

type Props = {
  pool: IPoolItem;
};

export function PoolDetailsContent({ pool }: Props) {
  const renderContent = () => (
    <Card
      sx={{
        p: 3,
        gap: 3,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Label
        title="If the pool is elected, stakers should expect to receive staking rewards as the pool will be eligible to produce blocks this epoch."
        color={
          (pool.isElected && 'success') ||
          'error'
        }
        sx={{ position: 'absolute', top: 24, right: 24 }}
      >
        {pool.isElected ? 'Elected' : 'Unelected'}
      </Label>
      <Typography variant="h3" component="h1">{pool.name}</Typography>

      <Markdown children={pool.description} />

      <Stack spacing={2}>
        <Typography variant="h6">Staked NIM</Typography>
        <Box sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
          <Chip key="Staked NIM" label={fShortenNumber(pool.balance).toUpperCase()} variant="soft" />
          <Chip key="Staked NIM Share" label={fPercent(pool.balanceShare)} variant="soft" />
        </Box>
      </Stack>

      <Stack spacing={2}>
        <Typography variant="h6">Stakers</Typography>
        <Box sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
        <Chip key="Stakers" label={fNumber(pool.numStakers)} variant="soft" />
        <Chip key="Stakers Share" label={fPercent(pool.numStakersShare)} variant="soft" />
        </Box>
      </Stack>

      <Stack spacing={2}>
        <Typography variant="h6">Score</Typography>
        <Box sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
        <Chip key="Overall" label={(pool.scoreOverall * 100).toFixed(2)} variant="soft" />
        </Box>
      </Stack>
    </Card>
  );

  const renderOverview = () => (
    <Card
      sx={{
        p: 3,
        gap: 2,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {[
        {
          label: 'Pool Fee',
          value: fPercent(pool.fee * 100),
          icon: <Iconify icon="mdi:currency-usd" />,
        },
        {
          label: 'Payout Type',
          value: fCapitalizeString(pool.payoutType),
          icon: <Iconify icon="solar:wad-of-money-bold" />,
        },
        {
          label: 'Payout Schedule',
          value: pool.payoutSchedule || 'N/A',
          icon: <Iconify icon="solar:clock-circle-bold" />,
        },
        {
          label: 'Website',
          value: <Link 
                  href={pool.website || '#'} 
                  underline="hover" 
                  target="_blank"
                  color="inherit"
                >
                  {pool.website || 'N/A'}
                </Link>
          ,
          icon: <Iconify icon="mdi:home" />,
        },
        {
          label: 'Reward Address',
          value: <>{fShortenString(pool.rewardAddress)}<CopyToClipboard title="Reward Address" text={pool.rewardAddress} /></>,
          icon: <Iconify icon="mdi:map-marker" />,
        },
      ].map((item) => (
        <Box key={item.label} sx={{ gap: 1.5, display: 'flex' }}>
          {item.icon}
          <ListItemText
            primary={item.label}
            secondary={item.value}
            primaryTypographyProps={{ typography: 'h6', color: 'text.secondary', mb: 0.5 }}
            secondaryTypographyProps={{
              component: 'span',
              color: 'text.primary',
              typography: 'subtitle1',
            }}
          />
        </Box>
      ))}
    </Card>
  );

  const renderPool = () => (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        mt: 3,
        gap: 2,
        borderRadius: 2,
        display: 'flex',
      }}
    >
      <Link 
        component={RouterLink}
        href={pool.addressLink || '#'} 
        underline="hover" 
        color="inherit"
      >
        <Avatar
          alt={pool.name}
          src={pool.logo}
          variant="rounded"
          sx={{ width: 64, height: 64 }}
        />
      </Link>

      <Stack spacing={1}>
        <Typography variant="subtitle1">
          <Link 
            component={RouterLink}
            href={pool.addressLink || '#'} 
            underline="hover" 
            color="inherit"
          >
            {pool.name}
          </Link>
        </Typography>
        <Typography variant="body2">
          {fShortenString(pool.address || '')}
          <CopyToClipboard title="Pool Address" text={pool.address || ''} />
        </Typography>
      </Stack>
    </Paper>
  );

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 8 }}>{renderContent()}</Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        {renderOverview()}
        {renderPool()}
      </Grid>
    </Grid>
  );
}

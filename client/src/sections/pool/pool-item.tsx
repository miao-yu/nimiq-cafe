import type { IPoolItem } from 'src/types/pool';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';

import { RouterLink } from 'src/routes/components';

import { fCapitalizeString } from 'src/utils/format-blockchain';
import { fNumber, fPercent, fShortenNumber } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  pool: IPoolItem;
  detailsHref: string;
};

export function PoolItem({ pool, detailsHref }: Props) {
  return (
    <Card>
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
        <Box sx={{ p: 3, pb: 2 }}>
          <Link component={RouterLink} href={detailsHref} color="inherit">
            <Avatar
              alt={pool.name}
              src={pool.logo}
              variant="circular"
              sx={{ width: 48, height: 48, mb: 2 }}
            />
          </Link>

          <ListItemText
            sx={{ mb: 1 }}
            primary={
              <Link component={RouterLink} href={detailsHref} color="inherit">
                {pool.name}
              </Link>
            }
            primaryTypographyProps={{ typography: 'h4' }}
            secondaryTypographyProps={{
              mt: 1,
              component: 'span',
              typography: 'caption',
              color: 'text.disabled',
            }}
          />

          <Box
            sx={{
              gap: 0.5,
              display: 'flex',
              alignItems: 'center',
              color: 'primary.main',
              typography: 'caption',
              mb: 0.5,
              fontSize: '0.9rem',
            }}
          >
            <Iconify width={16} icon="mdi:currency-usd" />
            {`${fShortenNumber(pool.balance).toUpperCase()} $NIM`}
          </Box>

          <Box
            sx={{
              gap: 0.5,
              display: 'flex',
              alignItems: 'center',
              color: 'primary.main',
              typography: 'caption',
              fontSize: '0.9rem',
            }}
          >
            <Iconify width={16} icon="solar:users-group-rounded-bold" />
            {`${fNumber(pool.numStakers)} Stakers`}
          </Box>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box
          sx={{
            p: 3,
            rowGap: 1.5,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
          }}
        >
          {[
            {
              label: fPercent(pool.fee * 100),
              description: 'Pool Fee',
              icon: <Iconify width={16} icon="mdi:currency-usd" sx={{ flexShrink: 0 }} />,
            },
            {
              label: fCapitalizeString(pool.payoutType),
              description: 'Payout Type',
              icon: <Iconify width={16} icon="solar:wad-of-money-bold" sx={{ flexShrink: 0 }} />,
            },
            {
              label: pool.payoutSchedule || 'N/A',
              description: 'Payout Schedule',
              icon: <Iconify width={16} icon="solar:clock-circle-bold" sx={{ flexShrink: 0 }} />,
            },
            {
              label: (pool.scoreOverall * 100).toFixed(2),
              description: 'Score',
              icon: <SvgIcon sx={{ width: 16, flexShrink: 0 }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              <path d="M12 7.5l1.76 3.58 3.96.58-2.87 2.79.68 3.95L12 15.42l-3.53 1.85.68-3.95-2.87-2.79 3.96-.58L12 7.5z" />
            </SvgIcon>,
            },
          ].map((item) => (
            <Box
              key={item.label}
              title={item.description}
              sx={{
                gap: 0.5,
                minWidth: 0,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                color: 'text.disabled',
              }}
            >
              {item.icon}
              <Typography sx={{ fontSize: '0.9rem' }} variant="caption" noWrap>
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Card>
  );
}

import type { IPoolStakerItem } from 'src/types/user';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fAddressInfo, fShortenString } from 'src/utils/format-blockchain';
import { fNumber, fPercent, fShortenNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

import { getTier } from '../overview/course/view/overview-course-view';

// ----------------------------------------------------------------------

type Props = {
  row: IPoolStakerItem;
};

export function PoolStakerRowItem({ row }: Props) {
  const addressInfo = fAddressInfo(row.address);
  const name = addressInfo ? addressInfo.name : fShortenString(row.address);
  const avatar = addressInfo && addressInfo.logo ? addressInfo.logo : row.avatar;

  const tier = getTier(row.joinDate);

  return (
    <TableRow>
      <TableCell>
        <Link 
          component={RouterLink}
          href={`${paths.staker}/${row.address}`} 
          underline="hover" 
          color="inherit"
        >
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar alt={row.address} src={avatar} />
            {name}
          </Box>
        </Link>
      </TableCell>

      <TableCell>
        <Box sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
          <Box
            sx={[
              (theme) => ({
                width: 40,
                height: 40,
                display: 'flex',
                borderRadius: '50%',
                alignItems: 'center',
                color: 'grey',
                justifyContent: 'center',
                bgcolor: varAlpha(theme.vars.palette.grey['600Channel'], 0.08),
                ...(tier === 'Explorer' && {
                  color: 'primary.main',
                  bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
                }),
                ...(tier === 'Pioneer' && {
                  color: 'info.main',
                  bgcolor: varAlpha(theme.vars.palette.info.mainChannel, 0.08),
                }),
                ...(tier === 'Pathfinder' && {
                  color: 'secondary.main',
                  bgcolor: varAlpha(theme.vars.palette.secondary.mainChannel, 0.08),
                }),
                ...(tier === 'Trailblazer' && {
                  color: 'warning.main',
                  bgcolor: varAlpha(theme.vars.palette.warning.mainChannel, 0.08),
                }),
                ...(tier === 'Visionary' && {
                  color: 'error.main',
                  bgcolor: varAlpha(theme.vars.palette.error.mainChannel, 0.08),
                }),
              }),
            ]}
          >
            <Iconify width={24} icon="solar:cup-star-bold" />
          </Box>
          <Box>
            {tier}
          </Box>
        </Box>
      </TableCell>

      <TableCell align="center">{fPercent(row.shared)}</TableCell>

      <TableCell align="center">{fShortenNumber(row.stakedNIM).toUpperCase()} $NIM</TableCell>

      <TableCell align="center">{fNumber(row.pendingPayout)} $NIM</TableCell>

      <TableCell align="right">
          {row.payoutType}
      </TableCell>

      <TableCell align="right">{row.joinDate.split('T')[0]}</TableCell>
    </TableRow>
  );
}

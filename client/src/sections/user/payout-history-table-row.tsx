import type { IPayoutHistoryItem } from 'src/types/blockchain';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fToNow } from 'src/utils/format-time';
import { fNumber } from 'src/utils/format-number';
import { fAddressInfo, fShortenString } from 'src/utils/format-blockchain';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  row: IPayoutHistoryItem;
};

export function PayoutHistoryRowItem({ row }: Props) {
  const addressInfo = fAddressInfo(row.address);
  const name = addressInfo ? addressInfo.name : fShortenString(row.address);
  const avatar = addressInfo && addressInfo.logo ? addressInfo.logo : row.avatar;

  return (
    <TableRow>
      <TableCell>{fNumber(row.epoch)}</TableCell>

      <TableCell align="center">
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

      <TableCell align="center">{row.rewards} $NIM</TableCell>

      <TableCell align="center">
        {row.payoutType}
      </TableCell>

      <TableCell align="center">
        <Link 
          component={RouterLink}
          href={row.txHashLink} 
          underline="hover" 
          color="inherit"
        >
          <Iconify width={16} icon="ic:outline-visibility" />
        </Link>
      </TableCell>

      <TableCell align="right">{fToNow(new Date(row.createdAt))}</TableCell>
    </TableRow>
  );
}

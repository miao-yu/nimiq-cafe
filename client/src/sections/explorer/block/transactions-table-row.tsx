import type { ITransactionDetailItem } from 'src/types/blockchain';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fNumber, fShortenNumber } from 'src/utils/format-number';
import { fAddressInfo, fShortenString } from 'src/utils/format-blockchain';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  row: ITransactionDetailItem;
};

export function TransactionRowItem({ row }: Props) {
  const fromAddressInfo = fAddressInfo(row.from);
  const fromName = fromAddressInfo ? fromAddressInfo.name : fShortenString(row.from);
  const fromAvatar = fromAddressInfo && fromAddressInfo.logo ? fromAddressInfo.logo : row.fromAvatar;

  const toAddressInfo = fAddressInfo(row.to);
  const toName = toAddressInfo ? toAddressInfo.name : fShortenString(row.to);
  const toAvatar = toAddressInfo && toAddressInfo.logo ? toAddressInfo.logo : row.toAvatar;

  return (
    <TableRow>
      <TableCell>
        <Link 
          component={RouterLink}
          href={`${paths.wallet}/${row.from}`} 
          underline="hover" 
          color="inherit"
        >
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar alt={row.from} src={fromAvatar} />
            {fromName}
          </Box>
        </Link>
      </TableCell>

      <TableCell>
        <Link 
          component={RouterLink}
          href={`${paths.wallet}/${row.to}`} 
          underline="hover" 
          color="inherit"
        >
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar alt={row.to} src={toAvatar} />
            {toName}
          </Box>
        </Link>
      </TableCell>

      <TableCell align="center">{fShortenNumber(row.value).toUpperCase()} $NIM</TableCell>

      <TableCell align="center">{fNumber(row.fee)} $NIM</TableCell>

      <TableCell align="right">
        <Link 
          component={RouterLink}
          href={row.link} 
          underline="hover" 
          color="inherit"
        >
          <Iconify width={16} icon="ic:outline-visibility" />
        </Link>
      </TableCell>
    </TableRow>
  );
}

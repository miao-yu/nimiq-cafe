import type { IPayoutItem } from 'src/types/blockchain';

import Link from '@mui/material/Link';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

import { RouterLink } from 'src/routes/components';

import { fToNow } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  row: IPayoutItem;
};

export function PayoutRowItem({ row }: Props) {
  return (
    <TableRow>
      <TableCell>{row.epoch}</TableCell>

      <TableCell>{row.reward} $NIM</TableCell>

      <TableCell align="center">
        {row.payoutType}
      </TableCell>

      <TableCell align="center">
        <Link 
          component={RouterLink}
          href={`/tx/${row.txHash}`} 
          underline="hover" 
          color="inherit"
        >
          <Iconify width={16} icon="ic:outline-visibility" />
        </Link>
      </TableCell>

      <TableCell align="right">{fToNow(new Date(row.created))}</TableCell>
    </TableRow>
  );
}

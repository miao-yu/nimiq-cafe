import type { IPoolRewardItem } from 'src/types/blockchain';

import Link from '@mui/material/Link';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

import { RouterLink } from 'src/routes/components';

import { fToNow } from 'src/utils/format-time';
import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';



// ----------------------------------------------------------------------

type Props = {
  row: IPoolRewardItem;
};

export function PoolRewardsRowItem({ row }: Props) {
  return (
    <TableRow>
      <TableCell>{fNumber(row.epoch)}</TableCell>

      <TableCell align="center">
        <Link 
          component={RouterLink}
          href={row.blockNumberLink} 
          underline="hover" 
          color="inherit"
        >
          {fNumber(row.blockNumber)}
        </Link>
      </TableCell>

      <TableCell align="center">{row.value} $NIM</TableCell>
            
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

      <TableCell align="right">
        {fToNow(new Date(row.createdAt))}
      </TableCell>
    </TableRow>
  );
}

import type { IWalletStakerItem } from 'src/types/blockchain';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

import { paths } from 'src/routes/paths';

import { fAddressInfo } from 'src/utils/format-blockchain';
import { fPercent, fShortenNumber } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type Props = {
  row: IWalletStakerItem;
};

export function WalletStakerRowItem({ row }: Props) {
  const addressInfo = fAddressInfo(row.address);
  const name = addressInfo ? addressInfo.name : row.name;
  const avatar = addressInfo && addressInfo.logo ? addressInfo.logo : row.avatar;
  return (
    <TableRow>
      <TableCell>
        <Link 
          href={`${paths.wallet}/${row.address}`} 
          underline="hover" 
          color="inherit"
        >
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar alt={row.address} src={avatar} />
            {name}
          </Box>
        </Link>
      </TableCell>

      <TableCell align="center">{fShortenNumber(row.stakedNIM).toUpperCase()} $NIM</TableCell>

      <TableCell align="right">{fPercent(row.shared)}</TableCell>
    </TableRow>
  );
}

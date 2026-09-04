import type { IRewardItem } from 'src/types/blockchain';

import Box from '@mui/material/Box';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

import { fToNow } from 'src/utils/format-time';

// ----------------------------------------------------------------------

type Props = {
  row: IRewardItem;
};

export function RewardRowItem({ row }: Props) {
  return (
    <TableRow>
      <TableCell>
        <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
          {row.epoch}
        </Box>
      </TableCell>

      <TableCell align="center">{row.reward} $NIM</TableCell>

      <TableCell align="right">{fToNow(new Date(row.created))}</TableCell>
    </TableRow>
  );
}

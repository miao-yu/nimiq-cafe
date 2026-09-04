import type { CardProps } from '@mui/material/Card';
import type { TableHeadCellProps } from 'src/components/table';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import CardHeader from '@mui/material/CardHeader';

import { useGetRewards } from 'src/actions/pool';

import { Scrollbar } from 'src/components/scrollbar';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { RewardRowItem } from '../../order/reward-table-row';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'epoch', label: 'Epoch' },
  { id: 'reward', label: 'Reward', align: 'center' },
  { id: 'created', label: 'Created', align: 'right' },
];

type Props = CardProps & {
  title?: string;
  subheader?: string;
  address: string;
};

export function Rewards({
  title,
  subheader,
  sx,
  address,
  ...other
}: Props) {
  const table = useTable({
    defaultRowsPerPage: 10,
  });

  const { rewards, rewardsLoading } = useGetRewards(address);

  if (rewardsLoading) {
    return <Card sx={sx} {...other}>Loading...</Card>;
  }

  const notFound = !rewards.length;

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} sx={{ mb: 3 }} />
      <Box sx={{ position: 'relative' }}>
        <Scrollbar>
          <Table size={table.dense ? 'small' : 'medium'}>
            <TableHeadCustom
              order={table.order}
              orderBy={table.orderBy}
              headCells={TABLE_HEAD}
              rowCount={rewards.length}
              onSort={table.onSort}
            />

            <TableBody>
              {rewards
                .slice(
                  table.page * table.rowsPerPage,
                  table.page * table.rowsPerPage + table.rowsPerPage
                )
                .map((row) => (
                  <RewardRowItem key={row.created} row={row} />
                ))}

              <TableEmptyRows
                height={table.dense ? 56 : 56 + 20}
                emptyRows={emptyRows(table.page, table.rowsPerPage, rewards.length)}
              />

              <TableNoData notFound={notFound} />
            </TableBody>
          </Table>
        </Scrollbar>
      </Box>

      <TablePaginationCustom
        page={table.page}
        dense={table.dense}
        count={rewards.length}
        rowsPerPage={table.rowsPerPage}
        onPageChange={table.onChangePage}
        onChangeDense={table.onChangeDense}
        onRowsPerPageChange={table.onChangeRowsPerPage}
      />
    </Card>
  );
}

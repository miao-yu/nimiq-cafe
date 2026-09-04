import type { CardProps } from '@mui/material/Card';
import type { TableHeadCellProps } from 'src/components/table';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import CardHeader from '@mui/material/CardHeader';

import { useGetPayouts } from 'src/actions/pool';

import { Scrollbar } from 'src/components/scrollbar';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { PayoutRowItem } from '../../order/payout-table-row';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'epoch', label: 'Epoch' },
  { id: 'amount', label: 'Amount' },
  { id: 'payoutType', label: 'Payout Type', align: 'center' },
  { id: 'transaction', label: 'Transaction', align: 'center' },
  { id: 'created', label: 'Created', align: 'right' },
];

type Props = CardProps & {
  title?: string;
  subheader?: string;
  address: string;
};

export function Payouts({
  title,
  subheader,
  sx,
  address,
  ...other
}: Props) {
  const table = useTable({
    defaultRowsPerPage: 10,
  });

  const { payouts, payoutsLoading } = useGetPayouts(address);

  if (payoutsLoading) {
    return <Card sx={sx} {...other}>Loading...</Card>;
  }

  const notFound = !payouts.length;

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} sx={{ mb: 3 }} />
      <Box sx={{ position: 'relative' }}>
        <Scrollbar>
          <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 560 }}>
            <TableHeadCustom
              order={table.order}
              orderBy={table.orderBy}
              headCells={TABLE_HEAD}
              rowCount={payouts.length}
              onSort={table.onSort}
            />

            <TableBody>
              {payouts
                .slice(
                  table.page * table.rowsPerPage,
                  table.page * table.rowsPerPage + table.rowsPerPage
                )
                .map((row) => (
                  <PayoutRowItem key={row.created} row={row} />
                ))}

              <TableEmptyRows
                height={table.dense ? 56 : 56 + 20}
                emptyRows={emptyRows(table.page, table.rowsPerPage, payouts.length)}
              />

              <TableNoData notFound={notFound} />
            </TableBody>
          </Table>
        </Scrollbar>
      </Box>

      <TablePaginationCustom
        page={table.page}
        dense={table.dense}
        count={payouts.length}
        rowsPerPage={table.rowsPerPage}
        onPageChange={table.onChangePage}
        onChangeDense={table.onChangeDense}
        onRowsPerPageChange={table.onChangeRowsPerPage}
      />
    </Card>
  );
}

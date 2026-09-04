import type { CardProps } from '@mui/material/Card';
import type { TableHeadCellProps } from 'src/components/table';
import type { IPayoutHistoryItem } from 'src/types/blockchain';
import type { IPayoutHistoryTableFilters } from 'src/types/user';

import { useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import CardHeader from '@mui/material/CardHeader';

import { Scrollbar } from 'src/components/scrollbar';
import {
  useTable,
  emptyRows,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { PayoutHistoryRowItem } from '../../user/payout-history-table-row';
import { PayoutHistoryTableToolbar } from '../../user/payout-history-table-toolbar';
import { PayoutHistoryTableFiltersResult } from '../../user/payout-history-table-filters-result';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'Epoch', label: 'Epoch' },
  { id: 'Address', label: 'Address' },
  { id: 'Amount', label: 'Amount', align: 'center' },
  { id: 'PayoutType', label: 'Payout Type', align: 'center' },
  { id: 'Transaction', label: 'Transaction', align: 'center' },
  { id: 'Created', label: 'Created', align: 'right' },
];

type Props = CardProps & {
  title?: string;
  subheader?: string;
  data: IPayoutHistoryItem[];
};

export function PayoutHistory({
  title,
  subheader,
  sx,
  data,
  ...other
}: Props) {
  const table = useTable({
    defaultRowsPerPage: 10,
  }
  );

  const tableData = data || [];

  const filters = useSetState<IPayoutHistoryTableFilters>({ address: '' });
  const { state: currentFilters } = filters;

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters: currentFilters,
  });

  const canReset =
    !!currentFilters.address;

  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} sx={{ mb: 3 }} />
      <PayoutHistoryTableToolbar
        filters={filters}
        onResetPage={table.onResetPage}
      />

      {canReset && (
        <PayoutHistoryTableFiltersResult
          filters={filters}
          totalResults={dataFiltered.length}
          onResetPage={table.onResetPage}
          sx={{ p: 2.5, pt: 0 }}
        />
      )}

      <Box sx={{ position: 'relative' }}>
        <Scrollbar>
          <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 760 }}>
            <TableHeadCustom
              order={table.order}
              orderBy={table.orderBy}
              headCells={TABLE_HEAD}
              rowCount={dataFiltered.length}
              onSort={table.onSort}
            />

            <TableBody>
              {dataFiltered
                .slice(
                  table.page * table.rowsPerPage,
                  table.page * table.rowsPerPage + table.rowsPerPage
                )
                .map((row) => (
                  <PayoutHistoryRowItem key={row.txHash} row={row} />
                ))}

              <TableEmptyRows
                height={table.dense ? 56 : 56 + 20}
                emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
              />

              <TableNoData notFound={notFound} />
            </TableBody>
          </Table>
        </Scrollbar>
      </Box>

      <TablePaginationCustom
        page={table.page}
        dense={table.dense}
        count={dataFiltered.length}
        rowsPerPage={table.rowsPerPage}
        onPageChange={table.onChangePage}
        onChangeDense={table.onChangeDense}
        onRowsPerPageChange={table.onChangeRowsPerPage}
      />
    </Card>
  );
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  inputData: IPayoutHistoryItem[];
  filters: IPayoutHistoryTableFilters;
  comparator: (a: any, b: any) => number;
};

function applyFilter({ inputData, comparator, filters }: ApplyFilterProps) {
  const { address } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index] as const);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (address) {
    inputData = inputData.filter((user) => user.address.toLowerCase().includes(address.toLowerCase()));
  }

  return inputData;
}

import type { CardProps } from '@mui/material/Card';
import type { IPoolRewardItem } from 'src/types/blockchain';
import type { TableHeadCellProps } from 'src/components/table';
import type { IPoolRewardsTableFilters } from 'src/types/user';

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

import { PoolRewardsRowItem } from '../../user/pool-rewards-table-row';
import { PoolRewardsTableToolbar } from '../../user/pool-rewards-table-toolbar';
import { PoolRewardsTableFiltersResult } from '../../user/pool-rewards-table-filters-result';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'Epoch', label: 'Epoch' },
  { id: 'Block', label: 'Block', align: 'center' },
  { id: 'Reward', label: 'Reward', align: 'center' },
  { id: 'Transaction', label: 'Transaction', align: 'center' },
  { id: 'Created', label: 'Created', align: 'right' },
];

type Props = CardProps & {
  title?: string;
  subheader?: string;
  data: IPoolRewardItem[];
};

export function PoolRewards({
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

  const filters = useSetState<IPoolRewardsTableFilters>({ txHash: '' });
  const { state: currentFilters } = filters;

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters: currentFilters,
  });

  const canReset =
    !!currentFilters.txHash;

  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} sx={{ mb: 3 }} />
      <PoolRewardsTableToolbar
        filters={filters}
        onResetPage={table.onResetPage}
      />

      {canReset && (
        <PoolRewardsTableFiltersResult
          filters={filters}
          totalResults={dataFiltered.length}
          onResetPage={table.onResetPage}
          sx={{ p: 2.5, pt: 0 }}
        />
      )}

      <Box sx={{ position: 'relative' }}>
        <Scrollbar>
          <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 620 }}>
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
                  <PoolRewardsRowItem key={row.txHash} row={row} />
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
  inputData: IPoolRewardItem[];
  filters: IPoolRewardsTableFilters;
  comparator: (a: any, b: any) => number;
};

function applyFilter({ inputData, comparator, filters }: ApplyFilterProps) {
  const { txHash } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index] as const);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (txHash) {
    inputData = inputData.filter((poolReward) => poolReward.txHash.toLowerCase().includes(txHash.toLowerCase()));
  }

  return inputData;
}

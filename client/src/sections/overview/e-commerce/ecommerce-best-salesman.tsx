import type { CardProps } from '@mui/material/Card';
import type { TableHeadCellProps } from 'src/components/table';
import type { IElectedValidatorItem } from 'src/types/blockchain';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import CardHeader from '@mui/material/CardHeader';

import { RouterLink } from 'src/routes/components';

import { fNumber, fPercent, fShortenNumber } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';
import { useTable, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  headCells: TableHeadCellProps[];
  tableData: IElectedValidatorItem[];
};

export function EcommerceBestSalesman({
  title,
  subheader,
  tableData,
  headCells,
  sx,
  ...other
}: Props) {
  const table = useTable({
    defaultRowsPerPage: 10,
  });
  
  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} sx={{ mb: 3 }} />

      <Scrollbar sx={{ minHeight: 422 }}>
        <Table sx={{ minWidth: 680 }}>
          <TableHeadCustom
          headCells={headCells}
          rowCount={tableData.length}
          />

          <TableBody>
            {tableData
            .slice(
              table.page * table.rowsPerPage,
              table.page * table.rowsPerPage + table.rowsPerPage
            )
            .map((row) => (
              <RowItem key={row.name} row={row} />
            ))}
          </TableBody>
        </Table>
      </Scrollbar>

      <TablePaginationCustom
        page={table.page}
        count={tableData.length}
        rowsPerPage={table.rowsPerPage}
        onPageChange={table.onChangePage}
        onRowsPerPageChange={table.onChangeRowsPerPage}
      />
    </Card>
  );
}

// ----------------------------------------------------------------------

type RowItemProps = {
  row: Props['tableData'][number];
};

function RowItem({ row }: RowItemProps) {
  return (
    <TableRow>
      <TableCell>
        <Link 
          component={RouterLink}
          href={row.addressLink} 
          underline="hover" 
          color="inherit"
        >
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar alt={row.name} src={row.logo} />
            {row.name}
          </Box>
      </Link>
      </TableCell>

      <TableCell align="center">
        {`${fNumber(row.numStakers)} (${fPercent(row.numStakersShare)})`}
      </TableCell>

      <TableCell align="center">
        {`${fNumber(row.numSlots)} (${fPercent(row.numSlotsShare)})`}
      </TableCell>
      
      <TableCell align="right">
        {`${fShortenNumber(row.balance).toUpperCase()} (${fPercent(row.balanceShare)})`}
      </TableCell>

      <TableCell align="right">
        <Label
          variant="soft"
          color="primary"
        >
          {row.rank}
        </Label>
      </TableCell>
    </TableRow>
  );
}

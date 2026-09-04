import type { BoxProps } from '@mui/material/Box';
import type { CardProps } from '@mui/material/Card';
import type { TableHeadCellProps} from 'src/components/table';

import { orderBy } from 'es-toolkit';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import CardHeader from '@mui/material/CardHeader';

import { fPercent } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { TableHeadCustom } from 'src/components/table';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  headCells: TableHeadCellProps[];
};

export function LoyaltyRewardsProgram({ title, subheader, headCells, sx, ...other }: Props) {
  const list = [
    {
      name: 'Seeker',
      description: 'Starting your quest into staking possibilities.',
      period: 1,
      off: 0,
    },
    {
      name: 'Explorer',
      description: 'Embark on your staking journey.',
      period: 7,
      off: 5,
    },
    {
      name: 'Pioneer',
      description: 'Leading the charge with loyalty.',
      period: 30,
      off: 10,
    },
    {
      name: 'Pathfinder',
      description: 'Carving your path to greater rewards.',
      period: 90,
      off: 15,
    },
    {
      name: 'Trailblazer',
      description: 'Forging ahead with unwavering commitment.',
      period: 180,
      off: 20,
    },
    {
      name: 'Visionary',
      description: 'A true staker, shaping the future.',
      period: 365,
      off: 25,
    },
  ];

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} sx={{ mb: 1 }} />
      <Scrollbar sx={{ minHeight: 530 }}>
        <Table sx={{ minWidth: 660 }}>
          <TableHeadCustom
          headCells={headCells}
          rowCount={list.length}
          />
          <TableBody>
            {orderBy(list, ['off'], ['asc']).map((item, index) => (
              <Item key={item.name} item={item} index={index} />
            ))}
          </TableBody>
        </Table>
      </Scrollbar>
    </Card>
  );
}

// ----------------------------------------------------------------------

type ItemProps = BoxProps & {
  index: number;
  item: {
    name: string;
    description: string;
    period: number;
    off: number;
  };
};

function Item({ item, index, sx, ...other }: ItemProps) {
  return (
    <TableRow>
      <TableCell>
        <Box
          sx={[
            (theme) => ({
              width: 40,
              height: 40,
              display: 'flex',
              borderRadius: '50%',
              alignItems: 'center',
              color: 'grey',
              justifyContent: 'center',
              bgcolor: varAlpha(theme.vars.palette.grey['600Channel'], 0.08),
              ...(index === 1 && {
                color: 'primary.main',
                bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
              }),
              ...(index === 2 && {
                color: 'info.main',
                bgcolor: varAlpha(theme.vars.palette.info.mainChannel, 0.08),
              }),
              ...(index === 3 && {
                color: 'secondary.main',
                bgcolor: varAlpha(theme.vars.palette.secondary.mainChannel, 0.08),
              }),
              ...(index === 4 && {
                color: 'warning.main',
                bgcolor: varAlpha(theme.vars.palette.warning.mainChannel, 0.08),
              }),
              ...(index === 5 && {
                color: 'error.main',
                bgcolor: varAlpha(theme.vars.palette.error.mainChannel, 0.08),
              }),
            }),
          ]}
        >
          <Iconify width={24} icon="solar:cup-star-bold" />
        </Box>
      </TableCell>

      <TableCell>
        <Box flexGrow={1}>
          <Box sx={{ typography: 'h6' }}>{item.name}</Box>

          <Box
            sx={{
              gap: 0.5,
              mt: 0.5,
              alignItems: 'center',
              typography: 'subtitle2',
              display: 'inline-flex',
              color: 'text.secondary',
            }}
          >
            {item.description}
          </Box>
        </Box>
      </TableCell>

      <TableCell align="center">
        <Box sx={{ typography: 'subtitle1' }}>{`>= ${item.period} days`}</Box>
      </TableCell>

      <TableCell align="right">
        <Box sx={{ typography: 'subtitle1' }}>{`${fPercent(item.off)} OFF`}</Box>
      </TableCell>
    </TableRow>
  );
}

import type { BoxProps } from '@mui/material/Box';
import type { CardProps } from '@mui/material/Card';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography'
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { fNumber, fPercent } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  balance: {
    totalBalance: number;
    stakingBalance: number;
    walletBalance: number;
    inactiveBalance: number;
  };
};

export function CourseReminders({ title, balance, sx, ...other }: Props) {
  return (
    <Card sx={sx} {...other}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        {title}
      </Typography>

      <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
        <Item
          key='totalBalance'
          balance={balance.totalBalance}
          title='Total Balance'
          percent={100}
          sx={[
            (theme) => ({
              color: [
                theme.vars.palette.error.main,
                theme.vars.palette.info.main,
                theme.vars.palette.secondary.main,
                theme.vars.palette.success.main,
              ][0],
            }),
          ]}
        />
        <Item
          key='stakingBalance'
          balance={balance.stakingBalance}
          title='Staking Balance'
          percent={balance.stakingBalance / balance.totalBalance * 100}
          sx={[
            (theme) => ({
              color: [
                theme.vars.palette.error.main,
                theme.vars.palette.info.main,
                theme.vars.palette.secondary.main,
                theme.vars.palette.success.main,
              ][1],
            }),
          ]}
        />
        <Item
          key='walletBalance'
          balance={balance.walletBalance}
          title='Wallet Balance'
          percent={balance.walletBalance / balance.totalBalance * 100}
          sx={[
            (theme) => ({
              color: [
                theme.vars.palette.error.main,
                theme.vars.palette.info.main,
                theme.vars.palette.secondary.main,
                theme.vars.palette.success.main,
              ][2],
            }),
          ]}
        />
        <Item
          key='inactiveBalance'
          balance={balance.inactiveBalance}
          title='Inactive Balance'
          percent={balance.inactiveBalance / balance.totalBalance * 100}
          sx={[
            (theme) => ({
              color: [
                theme.vars.palette.error.main,
                theme.vars.palette.info.main,
                theme.vars.palette.secondary.main,
                theme.vars.palette.success.main,
              ][3],
            }),
          ]}
        />
      </Box>
    </Card>
  );
}

// ----------------------------------------------------------------------

type CourseItemProps = BoxProps & {
  balance: number;
  title: string;
  percent: number;
};

function Item({ balance, title, percent, sx, ...other }: CourseItemProps) {
  return (
    <Box sx={[{ gap: 1.5, display: 'flex' }, ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
      <Box
        sx={{
          width: 6,
          my: '3px',
          height: 16,
          flexShrink: 0,
          opacity: 0.24,
          borderRadius: 1,
          bgcolor: 'currentColor',
        }}
      />

      <Box
        sx={{
          gap: 1,
          minWidth: 0,
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
        }}
      >
        <Typography variant="subtitle1" color="inherit" noWrap>
          {fNumber(balance)} $NIM
        </Typography>

        <Box
          color="inherit"
          sx={{
            gap: 0.5,
            display: 'flex',
            alignItems: 'center',
            typography: 'caption',
            color: 'text.secondary',
          }}
        >
          <Iconify width={20} icon="solar:calendar-date-bold" />
            <Typography variant="subtitle2" color="inherit" noWrap>
              {title}
          </Typography>
        </Box>

        {title !== 'Total Balance' && (
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
          <LinearProgress
            color="warning"
            variant="determinate"
            value={percent}
            sx={[
              (theme) => ({
                width: 1,
                height: 6,
                bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.16),
                [` .${linearProgressClasses.bar}`]: { bgcolor: 'currentColor' },
              }),
            ]}
          />
          <Box
            component="span"
            sx={{
              width: 40,
              typography: 'caption',
              color: 'text.primary',
              fontWeight: 'fontWeightMedium',
            }}
          >
            {fPercent(percent)}
          </Box>
        </Box>
        )}
      </Box>
    </Box>
  );
}

import type { IPoolStakerItem } from 'src/types/user';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import { Button } from '@mui/material';
import { cardClasses } from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fPercent, fShortenNumber } from 'src/utils/format-number';
import { fAddressInfo, fShortenString } from 'src/utils/format-blockchain';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { Rewards } from '../../app/rewards';
import { Payouts } from '../../app/payouts';
import { CourseReminders } from '../course-reminders';
import { CourseMyAccount } from '../course-my-account';
import { TotalRewards } from '../../app/total-rewards';
import { CourseHoursSpent } from '../course-hours-spent';
import { AppWidgetSimple } from '../../app/app-widget-simple';

// ----------------------------------------------------------------------

type Props = {
  poolStaker?: IPoolStakerItem;
  error: any;
  loading: boolean;
};

export function OverviewCourseView({ poolStaker, error, loading }: Props) {
  if (loading) {
    return (
      <DashboardContent maxWidth={false}>
        <EmptyContent
          filled
          title="Loading..."
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  if (error) {
    return (
      <DashboardContent maxWidth={false}>
        <EmptyContent
          filled
          title="Staker not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.staking}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to list
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  let name = poolStaker?.address ? fShortenString(poolStaker.address) : 'Staker';
  let avatar = poolStaker?.avatar || '';

  if (poolStaker) {
    const addressInfo = fAddressInfo(poolStaker.address);
    name = addressInfo ? addressInfo.name : fShortenString(poolStaker.address);
    avatar = addressInfo && addressInfo.logo ? addressInfo.logo : poolStaker.avatar;
  }

  const balance = {
    totalBalance: poolStaker?.totalBalance || 0,
    stakingBalance: poolStaker?.stakedNIM || 0,
    walletBalance: poolStaker?.walletBalance || 0,
    inactiveBalance: poolStaker?.inactiveBalance || 0,
  };

  return (
    <DashboardContent
      maxWidth={false}
      disablePadding
      sx={[
        (theme) => ({
          borderTop: { lg: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}` },
        }),
      ]}
    >
      <Box sx={{ display: 'flex', flex: '1 1 auto', flexDirection: { xs: 'column', lg: 'row' } }}>
        <Box
          sx={[
            (theme) => ({
              gap: 3,
              display: 'flex',
              minWidth: { lg: 0 },
              py: { lg: 3, xl: 5 },
              flexDirection: 'column',
              flex: { lg: '1 1 auto' },
              px: { xs: 2, sm: 3, xl: 5 },
              borderRight: {
                lg: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}`,
              },
            }),
          ]}
        >
          <Box sx={{ mb: 2 }}>
            <Typography title={`Hi, ${poolStaker?.address} 👋`} variant="h4" component="h1" sx={{ mb: 1 }}>
              Hi, {name} 👋
            </Typography>
            <Typography
              sx={{ color: 'text.secondary' }}
            >Welcome to the Pool Staker Dashboard!</Typography>
          </Box>

          {poolStaker && (
            <TotalRewards
              title="Rewards"
              address={poolStaker.address}
            />
          )}

          {poolStaker && (
            <CourseHoursSpent
              title="Daily Rewards"
              address={poolStaker.address}
            />
          )}

          <Box
            sx={{
              gap: 3,
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            }}
          >
            <AppWidgetSimple
              title="Tier"
              text={getTier(poolStaker?.joinDate || '2024-12-05')}
              color="info"
            />

            <AppWidgetSimple
              title="Shared"
              text={fPercent(poolStaker?.shared || 0)}
              color="error"
            />

            <AppWidgetSimple
              title="Staked NIM"
              text={fShortenNumber(poolStaker?.stakedNIM || 0).toUpperCase()}
              color="primary"
            />

            <AppWidgetSimple
              title="Join Date"
              text={poolStaker?.joinDate.split('T')[0] || '2024-12-05'}
              color="info"
            />
          </Box>

          <Box
            sx={{
              gap: 3,
              display: 'grid',
              alignItems: 'flex-start',
              gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' },
            }}
          >
            {poolStaker && (
              <Rewards
                title="Rewards"
                address={poolStaker.address}
              />
            )}

            {poolStaker && (
              <Payouts
                title="Payouts"
                address={poolStaker.address}
              />
            )}
          </Box>
        </Box>

        <Box
          sx={{
            width: 1,
            display: 'flex',
            flexDirection: 'column',
            px: { xs: 2, sm: 3, xl: 5 },
            pt: { lg: 8, xl: 10 },
            pb: { xs: 8, xl: 10 },
            flexShrink: { lg: 0 },
            gap: { xs: 3, lg: 5, xl: 8 },
            maxWidth: { lg: 320, xl: 360 },
            bgcolor: { lg: 'background.neutral' },
            [`& .${cardClasses.root}`]: {
              p: { xs: 3, lg: 0 },
              boxShadow: { lg: 'none' },
              bgcolor: { lg: 'transparent' },
            },
          }}
        >
          <CourseMyAccount name={name} address={poolStaker?.address} avatar={avatar} />

          <CourseReminders title="Balance" balance={balance} />
        </Box>
      </Box>
    </DashboardContent>
  );
}

export function getTier(stakerJoinDate: string) {

  const joinDate = new Date(stakerJoinDate);
  const currentDate = new Date();

  const diffTime = Math.abs(currentDate.getTime() - joinDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= 7 && diffDays < 30) {
    return 'Explorer';
  } else if (diffDays >= 30 && diffDays < 90) {
    return 'Pioneer';
  } else if (diffDays >= 90 && diffDays < 180) {
    return 'Pathfinder';
  } else if (diffDays >= 180 && diffDays < 365) {
    return 'Trailblazer';
  } else if (diffDays >= 365) {
    return 'Visionary';
  } else {
    return 'Seeker';
  }
}

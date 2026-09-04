import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';

import { fNumber, fPercent, fShortenNumber } from 'src/utils/format-number';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';
import { useGetStakedInfo } from 'src/actions/blockchain';
import { useGetPoolRewards, useGetPoolStakers, useGetPayoutHistory } from 'src/actions/pool';

import { PoolStakers } from '../pool-stakers';
import { PoolRewards } from '../pool-rewards';
import { PayoutHistory } from '../payout-history';
import { AppWidgetSimple } from '../app-widget-simple';
import { LoyaltyRewardsProgram } from '../loyalty-rewards-program';

// ----------------------------------------------------------------------

export function OverviewAppView() {
  const { poolStakers } = useGetPoolStakers();
  const { stakedInfo } = useGetStakedInfo();
  const { payoutHistory } = useGetPayoutHistory();
  const { poolRewards } = useGetPoolRewards();

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h2" component="h1" sx={{ mb: 1 }}>
        {`Welcome to ${CONFIG.appName} Staking`} 👋
      </Typography>
      <Typography
        sx={{ color: 'text.secondary', mb: 2 }}
      >🎉 Pool fee as low as 2.25%, Payouts every 15 minutes, Super low pay threshold of just 10 $NIM! 🎉</Typography>
      <Grid container spacing={3}>
        <Grid container spacing={3} size={{ xs: 12, md: 6 }}>
          <Grid size={{ xs: 6}}>
            <AppWidgetSimple
              title="Pool Fee"
              text={fPercent(3)}
              color="error"
            />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <AppWidgetSimple
              title="Payout Interval"
              text="15 Mins"
              color="primary"
            />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <AppWidgetSimple
              title="Pay Threshold"
              text="10 $NIM"
              color="secondary"
            />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <AppWidgetSimple
              title="Pool Share"
              text={fPercent(stakedInfo?.validator.poolShare || 0)}
              color="warning"
            />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <AppWidgetSimple
              title="Pool Staked NIM"
              text={fShortenNumber(stakedInfo?.validator.poolTotalBalance || 0).toUpperCase()}
              color="info"
            />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <AppWidgetSimple
              title="Pool Stakers"
              text={fNumber(stakedInfo?.validator.poolTotalStakers || 0)}
              color="success"
            />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <AppWidgetSimple
              title="Total Staked NIM"
              text={fShortenNumber(stakedInfo?.network.totalBalance || 0).toUpperCase()}
              color="info"
            />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <AppWidgetSimple
              title="Total Stakers"
              text={fNumber(stakedInfo?.network.totalStakers || 0)}
              color="success"
            />
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <LoyaltyRewardsProgram
            title="Quest for Glory"
            subheader="Up to 25% Off Pool Fees for Long-Term Stakers!"
            headCells={[
              { id: 'Tier', label: '' },
              { id: 'TierName', label: 'Tier Name' },
              { id: 'StakingwithUs', label: 'Staking with Us', align: 'center' },
              { id: 'Privilege', label: 'Privilege', align: 'right' },
            ]}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <PoolStakers
            title="Pool Stakers"
            data={poolStakers}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <PoolRewards
            title="Pool Rewards"
            data={poolRewards}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <PayoutHistory
            title="Payout History"
            data={payoutHistory}
          />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}

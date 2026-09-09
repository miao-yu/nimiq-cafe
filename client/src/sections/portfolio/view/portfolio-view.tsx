import { useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { fCurrency, fShortenNumber } from 'src/utils/format-number';

import { useGetPortfolio } from 'src/actions/portfolio';
import { DashboardContent } from 'src/layouts/dashboard';

import { EmptyContent } from 'src/components/empty-content';

import { PortfolioStat } from '../portfolio-stat';
import { PortfolioValue } from '../portfolio-value';
import { PortfolioPitch } from '../portfolio-pitch';
import { PortfolioRewards } from '../portfolio-rewards';
import { PortfolioAccounts } from '../portfolio-accounts';
import { PortfolioAllocation } from '../portfolio-allocation';
import { balanceChange, rewardsInRange } from '../portfolio-range';

import type { PortfolioRange } from '../portfolio-range';

// ----------------------------------------------------------------------

const nim = (value: number) => `${fShortenNumber(value).toUpperCase()} NIM`;

export function PortfolioView() {
  const { portfolio, portfolioLoading, portfolioError, refreshPortfolio } = useGetPortfolio();

  // Owned here rather than by the chart: Balance Change and Rewards are read
  // against the same window, and two sources of truth for "which range" is how
  // they end up disagreeing.
  const [range, setRange] = useState<PortfolioRange>('1M');

  if (portfolioLoading) {
    return (
      <DashboardContent maxWidth={false}>
        <EmptyContent title="Loading..." />
      </DashboardContent>
    );
  }

  if (portfolioError || !portfolio) {
    return (
      <DashboardContent maxWidth={false}>
        <Alert severity="error">Could not load your portfolio. Try signing in again.</Alert>
      </DashboardContent>
    );
  }

  const { totals, price, tier } = portfolio;
  const nimUsd = price?.price ?? null;

  const usd = (value: number) => (nimUsd === null ? '—' : fCurrency(value * nimUsd));

  const change = balanceChange(portfolio.history, range, nimUsd);
  const rangeRewards = portfolio.rewards ? rewardsInRange(portfolio.rewards.daily, range) : null;

  // Staking, backfill finished, still nothing to show. The stake is with a
  // validator that pays out rather than compounds, so there is no restake
  // history in existence for us to have fetched.
  const rewardsUnavailable =
    tier >= 2 && !portfolio.rewards && !portfolio.backfill.pending;

  return (
    <DashboardContent maxWidth={false}>
      <Typography variant="h2" component="h1" sx={{ mb: 1 }}>
        Portfolio
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
        {portfolio.addresses.length === 1
          ? 'Everything held by the address you signed in with.'
          : `Everything held across your ${portfolio.addresses.length} addresses.`}
      </Typography>

      {/* Fiat leads, NIM sits under it. Total and Staked read current chain
          state and are right on the first visit; Balance Change and Rewards
          are scoped to the range chosen on the chart below. */}
      <Box
        sx={{
          gap: 3,
          mb: 3,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        }}
      >
        <PortfolioStat title="Total" primary={usd(totals.total)} secondary={nim(totals.total)} />

        <PortfolioStat
          title={`Balance Change ${range}`}
          primary={change === null ? '—' : `${change.usd >= 0 ? '+' : ''}${fCurrency(change.usd)}`}
          percent={change?.percent ?? undefined}
          percentNote={change === null ? undefined : `${change.nim >= 0 ? '+' : ''}${nim(change.nim)}`}
          note={change === null ? 'Needs two days of snapshots' : undefined}
        />

        <PortfolioStat title="Staked" primary={usd(totals.staked)} secondary={nim(totals.staked)} />

        <PortfolioStat
          title={`Rewards ${range}`}
          primary={rangeRewards === null ? '—' : usd(rangeRewards)}
          secondary={rangeRewards === null ? undefined : nim(rangeRewards)}
          note={
            rangeRewards !== null
              ? undefined
              : portfolio.backfill.pending
                ? 'Still gathering your history'
                : rewardsUnavailable
                  ? 'Not recorded by your validator'
                  : 'Nothing staked yet'
          }
        />
      </Box>

      <Box
        sx={{
          gap: 3,
          mb: 3,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: '1fr 2fr' },
        }}
      >
        <PortfolioAllocation title="Allocation" subheader="Where your NIM sits" totals={totals} />

        <PortfolioValue
          title="Value over time"
          subheader={nimUsd === null ? 'Daily snapshots (no price recorded)' : undefined}
          history={portfolio.history}
          range={range}
          onRangeChange={setRange}
          nimUsd={nimUsd}
          building={portfolio.backfill.historyPending}
        />
      </Box>

      {/* Rewards for anyone staking, wherever they stake. Ours comes from the
          pool ledger; a staker with another validator gets the same chart
          backfilled from the chain. Rendered while the backfill is still
          running too, so they see that it is coming rather than nothing. */}
      {tier >= 2 && (
        <Box sx={{ mb: 3 }}>
          <PortfolioRewards
            title="Daily rewards"
            subheader={
              portfolio.rewards?.source === 'nimiq-watch'
                ? 'Recorded on chain, via Nimiq Watch'
                : 'What your stake earned here, per day'
            }
            rewards={portfolio.rewards ?? { total: 0, today: 0, last30Days: 0, daily: [] }}
            pending={portfolio.backfill.pending}
            unavailable={rewardsUnavailable}
            range={range}
            onRangeChange={setRange}
          />
        </Box>
      )}

      {/* Kept for tier 2 even now that they have a chart: the numbers above are
          what they earned, this is what the fee difference costs them. */}
      {tier === 2 && portfolio.pitch && (
        <Box sx={{ mb: 3 }}>
          <PortfolioPitch pitch={portfolio.pitch} />
        </Box>
      )}

      <PortfolioAccounts
        title="Addresses"
        subheader="Add another address by signing with it"
        accounts={portfolio.accounts}
        signedInAddress={portfolio.signedInAddress}
        onChanged={() => refreshPortfolio()}
      />
    </DashboardContent>
  );
}

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { fCurrency, fShortenNumber } from 'src/utils/format-number';

import { useGetPortfolio } from 'src/actions/portfolio';
import { DashboardContent } from 'src/layouts/dashboard';

import { EmptyContent } from 'src/components/empty-content';

import { PortfolioValue } from '../portfolio-value';
import { PortfolioPitch } from '../portfolio-pitch';
import { PortfolioRewards } from '../portfolio-rewards';
import { PortfolioAccounts } from '../portfolio-accounts';
import { PortfolioAllocation } from '../portfolio-allocation';
import { AppWidgetSimple } from '../../overview/app/app-widget-simple';

// ----------------------------------------------------------------------

export function PortfolioView() {
  const { portfolio, portfolioLoading, portfolioError, refreshPortfolio } = useGetPortfolio();

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
        <Alert severity="error">
          Could not load your portfolio. Try signing in again.
        </Alert>
      </DashboardContent>
    );
  }

  const { totals, price, tier } = portfolio;
  const nimUsd = price?.price ?? null;

  return (
    <DashboardContent maxWidth={false}>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Portfolio
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
        {portfolio.addresses.length === 1
          ? 'Everything held by the address you signed in with.'
          : `Everything held across your ${portfolio.addresses.length} addresses.`}
      </Typography>

      {/* Headline numbers. These read current chain state, so they are correct
          from the first visit -- unlike the charts below, which need history. */}
      <Box
        sx={{
          gap: 3,
          mb: 3,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        }}
      >
        <AppWidgetSimple title="Total" text={`${fShortenNumber(totals.total).toUpperCase()} NIM`} />
        <AppWidgetSimple
          title="Value"
          text={nimUsd !== null ? fCurrency(totals.total * nimUsd) : '—'}
          color="info"
        />
        <AppWidgetSimple title="Staked" text={`${fShortenNumber(totals.staked).toUpperCase()} NIM`} color="warning" />
        <AppWidgetSimple
          title="Rewards"
          text={portfolio.rewards ? `${fShortenNumber(portfolio.rewards.total).toUpperCase()} NIM` : '—'}
          extraText={portfolio.rewards ? `${fShortenNumber(portfolio.rewards.last30Days).toUpperCase()} in 30d` : undefined}
          color="success"
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
          subheader={nimUsd !== null ? 'Daily snapshots' : 'Daily snapshots (no price recorded)'}
          history={portfolio.history}
        />
      </Box>

      {tier === 2 && portfolio.pitch && (
        <Box sx={{ mb: 3 }}>
          <PortfolioPitch pitch={portfolio.pitch} />
        </Box>
      )}

      {tier === 3 && portfolio.rewards && (
        <Box sx={{ mb: 3 }}>
          <PortfolioRewards
            title="Daily rewards"
            subheader="What your stake earned here, per day"
            rewards={portfolio.rewards}
          />
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

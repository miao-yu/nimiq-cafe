import type { ITransactionDetailItem } from 'src/types/blockchain';

import Grid from '@mui/material/Grid2';
import { Button } from '@mui/material';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fNumber, fShortenNumber } from 'src/utils/format-number';
import { fAddressInfo, fShortenString } from 'src/utils/format-blockchain';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { TransactionAccount } from '../transaction-account';
import { AppWidgetSimple } from '../../../overview/app/app-widget-simple';

// ----------------------------------------------------------------------

type Props = {
  transaction: ITransactionDetailItem | null;
  error: any;
  loading: boolean;
};

export function TransactionView({ transaction, error, loading }: Props) {
  if (loading || !transaction) {
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
          title="Transaction not found!"
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

  const fromAddressInfo = fAddressInfo(transaction.from);
  const fromName = fromAddressInfo ? fromAddressInfo.name : fShortenString(transaction.from);
  const fromAvatar = fromAddressInfo && fromAddressInfo.logo ? fromAddressInfo.logo : transaction.fromAvatar;

  const toAddressInfo = fAddressInfo(transaction.to);
  const toName = toAddressInfo ? toAddressInfo.name : fShortenString(transaction.to);
  const toAvatar = toAddressInfo && toAddressInfo.logo ? toAddressInfo.logo : transaction.toAvatar;

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h2" component="h1" sx={{ mb: 1 }}>
        {`${fShortenString(transaction.hash)} - Transaction`} 👋
      </Typography>
      <Typography
        sx={{ color: 'text.secondary', mb: 2 }}
      >{`Discover in-depth information about individual Nimiq transaction with ${CONFIG.appName}.`}</Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TransactionAccount title="From" name={fromName} address={transaction.from} avatar={fromAvatar} link={transaction.fromLink} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TransactionAccount title="To" name={toName} address={transaction.to} avatar={toAvatar} link={transaction.toLink} />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AppWidgetSimple
            title="Hash"
            text={fShortenString(transaction.hash)}
            color="error"
            copy
            textToCopy={transaction.hash}
          />
        </Grid>
        
        <Grid size={{ xs: 6, md: 6, lg: 4 }}>
          <AppWidgetSimple
            title="Amount"
            text={`${fShortenNumber(transaction.value).toUpperCase()} $NIM`}
            color="primary"
          />
        </Grid>
        
        <Grid size={{ xs: 6, md: 6, lg: 4 }}>
          <AppWidgetSimple
            title="Fee"
            text={fNumber(transaction.fee)}
            color="secondary"
          />
        </Grid>

        {/* <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <AppWidgetSimple
            title="Confirmations"
            text={fNumber(confirmations)}
            color="warning"
          />
        </Grid> */}
        
        <Grid size={{ xs: 6, md: 6, lg: 4 }}>
          <AppWidgetSimple
            title="Block #"
            text={fNumber(transaction.blockNumber)}
            color="info"
            copy
            textToCopy={transaction.blockNumber}
          />
        </Grid>

        <Grid size={{ xs: 6, md: 6, lg: 4 }}>
          <AppWidgetSimple
            title="Validity Start"
            text={fNumber(transaction.validityStartHeight)}
            color="success"
            copy
            textToCopy={transaction.validityStartHeight}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AppWidgetSimple
            title="Datetime"
            text={transaction.datetime || 'N/A'}
            color="secondary"
          />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}

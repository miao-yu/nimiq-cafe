import type { IBlockDetailItem } from 'src/types/blockchain';

import Grid from '@mui/material/Grid2';
import { Button } from '@mui/material';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fNumber, fShortenNumber } from 'src/utils/format-number';
import { fBytes, fShortenString } from 'src/utils/format-blockchain';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { Transactions } from '../transactions';
import { AppWidgetSimple } from '../../../overview/app/app-widget-simple';

// ----------------------------------------------------------------------

type Props = {
  block: IBlockDetailItem | null;
  error: any;
  loading: boolean;
};

export function BlockView({ block, error, loading }: Props) {
  if (loading || !block) {
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
          title="Block not found!"
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

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h2" component="h1" sx={{ mb: 1 }}>
        {`${block.number} - Block`} 👋
      </Typography>
      <Typography
        sx={{ color: 'text.secondary', mb: 2 }}
      >{`Discover in-depth information about individual Nimiq block with ${CONFIG.appName}.`}</Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <AppWidgetSimple
            title="Hash"
            text={fShortenString(block.hash)}
            color="primary"
            copy
            textToCopy={block.hash}
          />
        </Grid>

        <Grid size={{ xs: 6, md: 4}}>
          <AppWidgetSimple
            title="Block #"
            text={fNumber(block.number)}
            color="error"
            copy
            textToCopy={block.number}
          />
        </Grid>
        
        {/* <Grid size={{ xs: 6, md: 3 }}>
          <AppWidgetSimple
            title="Epoch #"
            text={fNumber(block.epoch)}
            color="info"
          />
        </Grid>

        <Grid size={{ xs: 6, md: 3 }}>
          <AppWidgetSimple
            title="Batch #"
            text={fNumber(block.batch)}
            color="success"
          />
        </Grid> */}

        <Grid size={{ xs: 6, md: 4 }}>
          <AppWidgetSimple
            title="Size"
            text={fBytes(block.size)}
            color="info"
          />
        </Grid>

        <Grid size={{ xs: 6, md: 4 }}>
          <AppWidgetSimple
            title="TX Count"
            text={fNumber(block.txCount)}
            color="success"
          />
        </Grid>

        <Grid size={{ xs: 6, md: 4 }}>
          <AppWidgetSimple
            title="TX Volume"
            text={`${fShortenNumber(block.txVolume).toUpperCase()} $NIM`}
            color="success"
          />
        </Grid>
        
        <Grid size={{ xs: 12, md: 4 }}>
          <AppWidgetSimple
            title="Datetime"
            text={block.datetime}
            color="secondary"
          />
        </Grid>

        {/* { block.producer && (
          <>
          <Grid size={{ xs: 6, md: 3 }}>
            <AppWidgetSimple
              title="Producer"
              text={block.producer.validatorName}
              color="success"
            />
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <AppWidgetSimple
              title="Slot #"
              text={fNumber(block.producer.slotNumber)}
              color="success"
            />
          </Grid>
          </>
          )
        } */}

        {block.transactions.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Transactions
              title="Transactions"
              data={block.transactions}
            />
          </Grid>
          )
        }
      </Grid>
    </DashboardContent>
  );
}

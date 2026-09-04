import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { useGetNimPrice } from 'src/actions/calculator';
import { DashboardContent } from 'src/layouts/dashboard';

import { LoadingScreen } from 'src/components/loading-screen';

import { ConverterForm } from '../converter-form';

// ----------------------------------------------------------------------

function formatUpdated(timestamp?: number) {
  if (!timestamp) return null;

  return new Date(timestamp * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

// ----------------------------------------------------------------------

export function ConverterView() {
  const { nimPrice, nimPriceLoading } = useGetNimPrice();

  const updated = formatUpdated(nimPrice?.timestamp);

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h2" component="h1" sx={{ mb: 1 }}>
        Nimiq Converter
      </Typography>

      {updated && (
        <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
          Last updated {updated} (UTC +0)
        </Typography>
      )}

      <Box sx={{ display: 'grid', gap: 3 }}>
        {nimPriceLoading || !nimPrice ? <LoadingScreen /> : <ConverterForm price={nimPrice} />}
      </Box>
    </DashboardContent>
  );
}

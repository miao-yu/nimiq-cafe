import React from 'react';

import Grid from '@mui/material/Grid2';
import { Box, Card, Skeleton } from '@mui/material';

const DashboardTransaction: React.FC = () => (
    <Grid size={{ xs: 6, md: 3 }}>
      <Card
        sx={[
          () => ({
            p: 3,
            display: 'flex',
            zIndex: 'unset',
            overflow: 'unset',
            alignItems: 'center',
          }),
        ]}
      >
        <Box sx={{ flexGrow: 1 }}>
          {/* Transaction Hash */}
          <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center', mb: 2 }}>
            <Skeleton variant="circular" width={25} height={25} sx={{ mr: 1.5 }} />
            <Skeleton variant="text" width="40%" height={30} />
          </Box>

          {/* Transaction Sender and Receiver */}
          <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center', mb: 2 }}>
            <Skeleton variant="circular" width={30} height={30} sx={{ mr: 1 }} />
            <Skeleton variant="text" width="50%" height={30} />
          </Box>

          {/* Transactions */}
          <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center' }}>
            <Skeleton variant="circular" width={25} height={25} sx={{ mr: 1.7 }} />
            <Skeleton variant="text" width="30%" height={30} />
          </Box>
        </Box>
      </Card>
    </Grid>
  );

export default DashboardTransaction;

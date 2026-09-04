import React from 'react';

import { Box, Card, Skeleton } from '@mui/material';

const AppWidgetSimplePlaceholder: React.FC = () => (
  <Card
    sx={{
      p: 3,
      display: 'flex',
      zIndex: 'unset',
      overflow: 'unset',
      alignItems: 'center',
    }}
  >
    <Box sx={{ flexGrow: 1 }}>
      {/* Title */}
      <Skeleton variant="text" width="40%" height={25} sx={{ mb: 1 }} />

      {/* Main Text */}
      <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />

      {/* Extra Text */}
      <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center' }}>
        <Skeleton variant="circular" width={16} height={16} />
        <Skeleton variant="text" width="30%" height={20} />
      </Box>
    </Box>
  </Card>
);

export default AppWidgetSimplePlaceholder;

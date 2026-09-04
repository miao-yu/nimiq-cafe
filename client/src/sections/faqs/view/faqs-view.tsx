import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { FaqsList } from '../faqs-list';

// ----------------------------------------------------------------------

export function FaqsView() {
  return (
    <Container maxWidth='xl' sx={{ pb: 10, position: 'relative', pt: { xs: 1, md: 2 } }}>
      <Typography variant="h2" sx={{ mb: 2 }}>
        Frequently Asked Questions
      </Typography>

      <Box
        sx={{
          gap: 10,
          display: 'grid',
        }}
      >
        <FaqsList />
      </Box>
    </Container>
  );
}

import type { IPoolStakerTableFilters } from 'src/types/user';
import type { UseSetStateReturn } from 'minimal-shared/hooks';

import { useCallback } from 'react';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  onResetPage: () => void;
  filters: UseSetStateReturn<IPoolStakerTableFilters>;
};

export function PoolStakerTableToolbar({ filters, onResetPage }: Props) {
  const { state: currentFilters, setState: updateFilters } = filters;

  const handleFilterAddress = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onResetPage();
      updateFilters({ address: event.target.value });
    },
    [onResetPage, updateFilters]
  );

  return (
    <Box
        sx={{
          p: 2.5,
          gap: 2,
          display: 'flex',
          pr: { xs: 2.5, md: 1 },
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-end', md: 'center' },
        }}
      >
        <Box
          sx={{
            gap: 2,
            width: 1,
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <TextField
            fullWidth
            value={currentFilters.address}
            onChange={handleFilterAddress}
            placeholder="NQ88 0000 0000 0000 0000 0000 0000 0000 0000"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
      </Box>
  );
}

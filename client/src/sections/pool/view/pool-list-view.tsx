import type { IPoolItem } from 'src/types/pool';

import { orderBy } from 'es-toolkit';
import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';
import { useGetPools } from 'src/actions/blockchain';
import { DashboardContent } from 'src/layouts/dashboard';

import { EmptyContent } from 'src/components/empty-content';

import { PoolList } from '../pool-list';
import { PoolSort } from '../pool-sort';
import { PoolSearch } from '../pool-search';

const POOLS_SORT_OPTIONS = [
  { label: 'Fee', value: 'fee' },
  { label: 'Score', value: 'score' },
  { label: 'Balance', value: 'balance' },
  { label: 'Stakers', value: 'stakers' },
];

// ----------------------------------------------------------------------

export function PoolListView() {
  const {pools} = useGetPools();

  const [sortBy, setSortBy] = useState('fee');

  let dataFiltered = applyFilter({
    inputData: pools,
    sortBy,
  });

  const notFound = !dataFiltered.length;

  const target = 'NQ83 4MVH 53Q4 AL3B Q097 55GJ LUQ3 GSF0 85B7';

  dataFiltered = [
    ...dataFiltered.filter(data => data.address === target),
    ...dataFiltered.filter(data => data.address !== target)
  ];

  console.log('dataFiltered', dataFiltered);

  const handleSortBy = useCallback((newValue: string) => {
    setSortBy(newValue);
  }, []);

  const renderFilters = () => (
    <Box
      sx={{
        gap: 3,
        display: 'flex',
        justifyContent: 'space-between',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-end', sm: 'center' },
      }}
    >
      <PoolSearch pools={pools} redirectPath={(address: string) => paths.pools.details(address)} />

      <Box sx={{ gap: 1, flexShrink: 0, display: 'flex' }}>
        <PoolSort sort={sortBy} onSort={handleSortBy} sortOptions={POOLS_SORT_OPTIONS} />
      </Box>
    </Box>
  );

  return (
    <DashboardContent>
      <Typography variant="h2" component="h1" sx={{ mb: 1 }}>
        Welcome to Nimiq Pools 👋
      </Typography>
      <Typography
        sx={{ color: 'text.secondary', mb: 2 }}
      >{`🎉 Discover in-depth information about individual Nimiq staking pools with ${CONFIG.appName}. 🎉`}</Typography>

      <Stack spacing={2.5} sx={{ mb: { xs: 3, md: 5 } }}>
        {renderFilters()}
      </Stack>

      {notFound && <EmptyContent filled sx={{ py: 10 }} />}

      <PoolList pools={dataFiltered} />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  sortBy: string;
  inputData: IPoolItem[];
};

function applyFilter({ inputData, sortBy }: ApplyFilterProps) {
  // Sort by
  if (sortBy === 'balance') {
    inputData = orderBy(inputData, ['balance'], ['desc']);
  }

  if (sortBy === 'stakers') {
    inputData = orderBy(inputData, ['numStakers'], ['desc']);
  }

  if (sortBy === 'fee') {
    inputData = orderBy(inputData, ['fee'], ['asc']);
  }

  if (sortBy === 'score') {
    inputData = orderBy(inputData, ['scoreOverall'], ['desc']);
  }

  return inputData;
}

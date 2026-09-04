import type { IPoolItem } from 'src/types/pool';

import Box from '@mui/material/Box';

import { paths } from 'src/routes/paths';

import { PoolItem } from './pool-item';

// ----------------------------------------------------------------------

type Props = {
  pools: IPoolItem[];
};

export function PoolList({ pools }: Props) {
  return (
    <Box
        sx={{
          gap: 3,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        }}
      >
        {pools.map((pool) => (
          <PoolItem
            key={pool.address}
            pool={pool}
            detailsHref={paths.pools.details(pool.address)}
          />
        ))}
      </Box>
  );
}

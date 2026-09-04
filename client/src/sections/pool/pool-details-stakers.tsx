import type { IWalletStakerItem } from 'src/types/blockchain'

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Pagination from '@mui/material/Pagination';
import ListItemText from '@mui/material/ListItemText';

import { RouterLink } from 'src/routes/components/router-link';

import { fPercent, fShortenNumber } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type Props = {
  stakers: IWalletStakerItem[];
};

const ITEMS_PER_PAGE = 18;

export function PoolDetailsStakers({ stakers }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentStakers = stakers.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(stakers.length / ITEMS_PER_PAGE);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  return (
    <>
      <Box
        sx={{
          gap: 3,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(3, 1fr)' },
        }}
      >
        {currentStakers.map((staker) => (
          <Card key={staker.address} sx={{ p: 3, gap: 2, display: 'flex' }}>
            <Avatar alt={staker.name} src={staker.avatar} sx={{ width: 48, height: 48 }} />

            <Stack spacing={2}>
              <ListItemText
                primary={(<Link component={RouterLink} href={`/wallet/${staker.address}`} color="inherit">{staker.name}</Link>)}
                primaryTypographyProps={{ typography: 'subtitle1' }}
                secondary={`${fShortenNumber(staker.stakedNIM).toUpperCase()} $NIM (${fPercent(staker.shared)})`}
                secondaryTypographyProps={{
                  mt: 0.5,
                  component: 'span',
                  typography: 'subtitle2',
                  color: 'text.disabled',
                }}
              />
            </Stack>
          </Card>
        ))}
      </Box>

      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={handlePageChange}
        sx={{ mt: { xs: 5, md: 8 }, mx: 'auto' }}
      />
    </>
  );
}

import type { Theme, SxProps } from '@mui/material/styles';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import axios, { endpoints } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type SearchResult =
  | { type: 'block'; blockNumber: number }
  | { type: 'transaction'; hash: string }
  | { type: 'address'; address: string }
  | { type: null };

type Props = {
  placeholder?: string;
  sx?: SxProps<Theme>;
};

/**
 * Resolves a block height, block hash, transaction hash or account address to
 * its detail page. Block and transaction hashes are the same shape, so the
 * server works out which one it is and answers with the type.
 */
export function ExplorerSearch({
  placeholder = 'Search by block number, block hash, transaction hash or address',
  sx,
}: Props) {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();

    if (!trimmed) return;

    setLoading(true);
    setError('');

    try {
      const { data } = await axios.get<SearchResult>(`${endpoints.blockchain.search}/${encodeURIComponent(trimmed)}`);

      if (data.type === 'block') {
        router.push(`${paths.block}/${data.blockNumber}`);
      } else if (data.type === 'transaction') {
        router.push(`${paths.tx}/${data.hash}`);
      } else if (data.type === 'address') {
        router.push(`${paths.wallet}/${encodeURIComponent(data.address)}`);
      } else {
        setError('No block, transaction or account matches that search.');
      }
    } catch {
      setError('Search failed, please try again.');
    } finally {
      setLoading(false);
    }
  }, [query, router]);

  return (
    <Box sx={sx}>
      <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'flex-start' }}>
        <TextField
          fullWidth
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSearch();
          }}
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

        <Button
          size="large"
          variant="contained"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          sx={{ flexShrink: 0, height: 56 }}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : 'Search'}
        </Button>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}

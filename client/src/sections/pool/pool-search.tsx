import type { IPoolItem } from 'src/types/pool';
import type { Theme, SxProps } from '@mui/material/styles';

import parse from 'autosuggest-highlight/parse';
import match from 'autosuggest-highlight/match';
import { useDebounce } from 'minimal-shared/hooks';
import { useState, useEffect, useCallback } from 'react';

import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link, { linkClasses } from '@mui/material/Link';
import InputAdornment from '@mui/material/InputAdornment';
import Autocomplete, { autocompleteClasses } from '@mui/material/Autocomplete';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { SearchNotFound } from 'src/components/search-not-found';

// ----------------------------------------------------------------------

type Props = {
  pools: IPoolItem[];
  sx?: SxProps<Theme>;
  redirectPath: (id: string) => string;
};

export function PoolSearch({ pools, redirectPath, sx }: Props) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<IPoolItem | null>(null);

  const debouncedQuery = useDebounce(searchQuery);
  const { searchResults: options, searchLoading: loading } = useSearchData(pools, debouncedQuery);

  const handleChange = useCallback(
    (item: IPoolItem | null) => {
      setSelectedItem(item);
      if (item) {
        router.push(redirectPath(item.address));
      }
    },
    [redirectPath, router]
  );

  const paperStyles: SxProps<Theme> = {
    width: 320,
    [` .${autocompleteClasses.listbox}`]: {
      [` .${autocompleteClasses.option}`]: {
        p: 0,
        [` .${linkClasses.root}`]: {
          px: 1,
          py: 0.75,
          width: 1,
        },
      },
    },
  };

  return (
    <Autocomplete
      autoHighlight
      popupIcon={null}
      loading={loading}
      options={options}
      value={selectedItem}
      onChange={(event, newValue) => handleChange(newValue)}
      onInputChange={(event, newValue) => setSearchQuery(newValue)}
      getOptionLabel={(option) => option.name}
      noOptionsText={<SearchNotFound query={debouncedQuery} />}
      isOptionEqualToValue={(option, value) => option.address === value.address}
      slotProps={{ paper: { sx: paperStyles } }}
      sx={[{ width: { xs: 1, sm: 260 } }, ...(Array.isArray(sx) ? sx : [sx])]}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search..."
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ ml: 1, color: 'text.disabled' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <>
                  {loading ? <Iconify icon="svg-spinners:8-dots-rotate" sx={{ mr: -3 }} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      renderOption={(props, pool, { inputValue }) => {
        const matches = match(pool.name, inputValue);
        const parts = parse(pool.name, matches);

        return (
          <li {...props} key={pool.address}>
            <Link
              key={inputValue}
              component={RouterLink}
              href={redirectPath(pool.address)}
              color="inherit"
              underline="none"
            >
              {parts.map((part, index) => (
                <Typography
                  key={index}
                  component="span"
                  color={part.highlight ? 'primary' : 'textPrimary'}
                  sx={{
                    typography: 'body2',
                    fontWeight: part.highlight ? 'fontWeightSemiBold' : 'fontWeightMedium',
                  }}
                >
                  {part.text}
                </Typography>
              ))}
            </Link>
          </li>
        );
      }}
    />
  );
}

// ----------------------------------------------------------------------

function useSearchData(pools: IPoolItem[], searchQuery: string) {
  const [searchResults, setSearchResults] = useState<IPoolItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchSearchResults = useCallback(async () => {
    setSearchLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const results = pools.filter(({ name }) =>
        [name].some((field) => field?.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      setSearchResults(results);
    } catch (error) {
      console.error(error);
    } finally {
      setSearchLoading(false);
    }
  }, [pools, searchQuery]);

  useEffect(() => {
    if (searchQuery) {
      fetchSearchResults();
    } else {
      setSearchResults([]);
    }
  }, [fetchSearchResults, searchQuery]);

  return { searchResults, searchLoading };
}

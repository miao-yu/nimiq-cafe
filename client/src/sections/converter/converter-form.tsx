import type { INimPriceItem } from 'src/types/calculator';

import { useState, useCallback } from 'react';
import { useLocalStorage } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

// ----------------------------------------------------------------------

const STORAGE_KEY = 'nimiq-cafe-converter';

type StoredState = {
  nimiq: string;
  currency: string;
};

const defaultState: StoredState = { nimiq: '1', currency: 'USD' };

// ----------------------------------------------------------------------

const NIM_DECIMALS = 2;

/**
 * Fiat is shown to two decimals. BTC keeps the precision the v1 converter used,
 * since two decimals would round the whole value away.
 */
function decimalsFor(currency: string) {
  return currency === 'BTC' ? 8 : 2;
}

function parseAmount(value: string) {
  const parsed = parseFloat(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

// ----------------------------------------------------------------------

type Props = {
  price: INimPriceItem;
};

export function ConverterForm({ price }: Props) {
  const { state, setField } = useLocalStorage<StoredState>(STORAGE_KEY, defaultState);

  // Currency codes are the three-letter keys of price.json; `timestamp` is not one.
  const currencies = Object.keys(price)
    .filter((key) => key.length === 3)
    .map((key) => key.toUpperCase())
    .sort();

  const currency = currencies.includes(state.currency) ? state.currency : currencies[0];
  const rate = Number(price[currency.toLowerCase()]) || 0;

  // The fiat field is only tracked separately while the user is typing into it,
  // so that editing either side does not fight the other's formatting.
  const [fiatDraft, setFiatDraft] = useState<string | null>(null);

  const fiatValue = fiatDraft ?? (parseAmount(state.nimiq) * rate).toFixed(decimalsFor(currency));

  const handleNimiqChange = useCallback(
    (value: string) => {
      setFiatDraft(null);
      setField('nimiq', value);
    },
    [setField]
  );

  const handleFiatChange = useCallback(
    (value: string) => {
      setFiatDraft(value);

      const parsed = parseFloat(value);
      if (rate > 0 && Number.isFinite(parsed)) {
        setField('nimiq', (parsed / rate).toFixed(NIM_DECIMALS));
      }
    },
    [rate, setField]
  );

  const handleCurrencyChange = useCallback(
    (value: string) => {
      setFiatDraft(null);
      setField('currency', value);
    },
    [setField]
  );

  return (
    <Card sx={{ p: { xs: 3, md: 5 } }}>
      <Box
        sx={{
          gap: 2,
          display: 'flex',
          alignItems: { xs: 'stretch', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        <TextField
          fullWidth
          type="number"
          label="NIM"
          value={state.nimiq}
          onChange={(event) => handleNimiqChange(event.target.value)}
          slotProps={{
            input: {
              endAdornment: <InputAdornment position="end">NIM</InputAdornment>,
            },
          }}
        />

        <Typography variant="h4" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          =
        </Typography>

        <TextField
          fullWidth
          type="number"
          label={currency}
          value={fiatValue}
          onChange={(event) => handleFiatChange(event.target.value)}
        />

        <TextField
          select
          label="Currency"
          value={currency}
          onChange={(event) => handleCurrencyChange(event.target.value)}
          sx={{ minWidth: 120 }}
        >
          {currencies.map((code) => (
            <MenuItem key={code} value={code}>
              {code}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Stack sx={{ mt: 4 }} spacing={1}>
        <Typography variant="h6">What is this?</Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          A converter between NIM and your currency of choice, using the latest reference rate.
          Enter an amount on either side and the other updates.
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Non-USD rates are derived from the USD price, so they may differ slightly from the rate
          quoted by an individual exchange.
        </Typography>
      </Stack>
    </Card>
  );
}

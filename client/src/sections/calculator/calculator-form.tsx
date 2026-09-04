import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme, useMediaQuery } from '@mui/material';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export type CalculatorFormState = {
  stakingAmount: number;
  restake: boolean;
  circulatingSupplyStaked: number;
  nimPrice: number;
  poolFee: number;
  currency: string;
};

type Props = {
  state: CalculatorFormState;
  sign: string;
  currencies: string[];
  supplyStakedOptions: number[];
  onChangeField: (name: keyof CalculatorFormState, value: CalculatorFormState[keyof CalculatorFormState]) => void;
  onChangeCurrency: (currency: string) => void;
};

export function CalculatorForm({
  state,
  sign,
  currencies,
  supplyStakedOptions,
  onChangeField,
  onChangeCurrency,
}: Props) {
  const theme = useTheme();
  // There is room for the advanced options on a wide screen, so they stay open
  // there and only collapse behind the toggle when space is tight.
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));

  const [showAdvanced, setShowAdvanced] = useState(false);

  const advancedOpen = mdUp || showAdvanced;

  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={1} sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          1 NIM ={' '}
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 'fontWeightSemiBold' }}>
            {sign} {state.nimPrice}
          </Box>
        </Typography>
      </Stack>

      <Stack spacing={3}>
        <TextField
          fullWidth
          type="number"
          label="Staking amount (NIM)"
          value={state.stakingAmount}
          onChange={(event) => onChangeField('stakingAmount', Number(event.target.value))}
          slotProps={{ htmlInput: { min: 1000, max: 5000000000 } }}
        />

        <FormControlLabel
          label="Restake rewards"
          control={
            <Switch
              checked={state.restake}
              onChange={(event) => onChangeField('restake', event.target.checked)}
            />
          }
        />

        {!mdUp && (
          <Link
            component="button"
            type="button"
            variant="subtitle2"
            underline="none"
            onClick={() => setShowAdvanced((prev) => !prev)}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, alignSelf: 'flex-start' }}
          >
            Advanced options
            <Iconify
              icon={showAdvanced ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
            />
          </Link>
        )}

        <Collapse in={advancedOpen} unmountOnExit>
          <Stack spacing={3}>
            <Divider sx={{ borderStyle: 'dashed' }} />

            <TextField
              select
              fullWidth
              label="Circulating supply staked"
              value={state.circulatingSupplyStaked}
              onChange={(event) => onChangeField('circulatingSupplyStaked', Number(event.target.value))}
            >
              {supplyStakedOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}%
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Currency"
              value={state.currency}
              onChange={(event) => onChangeCurrency(event.target.value)}
            >
              {currencies.map((code) => (
                <MenuItem key={code} value={code}>
                  {code}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              type="number"
              label={`NIM price (${sign})`}
              value={state.nimPrice}
              onChange={(event) => onChangeField('nimPrice', Number(event.target.value))}
              slotProps={{ htmlInput: { min: 0, max: 1000000, step: 'any' } }}
            />

            <TextField
              fullWidth
              type="number"
              label="Pool fee (%)"
              value={state.poolFee}
              onChange={(event) => onChangeField('poolFee', Number(event.target.value))}
              slotProps={{ htmlInput: { min: 0, max: 100, step: 'any' } }}
            />
          </Stack>
        </Collapse>
      </Stack>
    </Card>
  );
}

import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import { fShortenString } from 'src/utils/format-blockchain';

// ----------------------------------------------------------------------

type Props = {
  /** Every address on the account. */
  addresses: string[];
  /** The address shown alone, or null for the combined total. */
  value: string | null;
  onChange: (address: string | null) => void;
};

/**
 * Which address the page is reading: all of them together, or one on its own.
 *
 * A select rather than a row of buttons because the list is not small -- an
 * account may follow twenty addresses, and twenty toggle buttons would wrap
 * into a wall above the figures they are meant to label.
 *
 * Renders nothing for an account with a single address: a control with one real
 * option is furniture, not a choice.
 */
export function PortfolioScope({ addresses, value, onChange }: Props) {
  if (addresses.length < 2) {
    return null;
  }

  return (
    <TextField
      select
      size="small"
      value={value ?? 'total'}
      onChange={(event) => onChange(event.target.value === 'total' ? null : event.target.value)}
      slotProps={{ select: { MenuProps: { slotProps: { paper: { sx: { maxHeight: 320 } } } } } }}
      sx={{ minWidth: 220 }}
    >
      <MenuItem value="total">All addresses</MenuItem>

      {addresses.map((address) => (
        <MenuItem key={address} value={address}>
          {fShortenString(address)}
        </MenuItem>
      ))}
    </TextField>
  );
}

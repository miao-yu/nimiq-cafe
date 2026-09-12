import type { CardProps } from '@mui/material/Card';
import type { IPortfolioAccount } from 'src/types/portfolio';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import TableContainer from '@mui/material/TableContainer';

import { fShortenNumber } from 'src/utils/format-number';
import { fShortenString } from 'src/utils/format-blockchain';

import { addPortfolioAddress, removePortfolioAddress } from 'src/actions/portfolio';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  accounts: IPortfolioAccount[];
  signedInAddress: string;
  onChanged: () => void;
};

/**
 * The addresses this portfolio covers, and the controls to change it.
 *
 * Adding one takes no signature. Balances and rewards are public chain data and
 * this page only reads them, so demanding a wallet unlock per address bought
 * friction rather than safety -- which is why there is an "enter an address"
 * field here now.
 *
 * The consequence is that following claims nothing about who controls an
 * address, so the list has to be one-way: an address you follow shows up in
 * your portfolio, and yours never shows up in its.
 */
export function PortfolioAccounts({
  title,
  subheader,
  accounts,
  signedInAddress,
  onChanged,
  sx,
  ...other
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [input, setInput] = useState('');

  const handleAdd = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      // The server parses and checksums it, and hands back the canonical
      // spacing -- so whatever was pasted, what lands here is the real form.
      const added = await addPortfolioAddress(input);

      setInput('');
      setNotice(`Added ${fShortenString(added)}.`);
      onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Could not add that address.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (address: string) => {
    setError(null);
    setNotice(null);
    try {
      await removePortfolioAddress(address);
      onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not remove that address.');
    }
  };

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} />

      {/* Paste and add. No wallet, no signature -- see actions/portfolio.ts. */}
      <Box sx={{ px: 3, pt: 2, gap: 1.5, display: 'flex', alignItems: 'flex-start' }}>
        <TextField
          fullWidth
          size="small"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && input.trim() && !busy) {
              handleAdd();
            }
          }}
          placeholder="NQ07 U2Y4 HV3H 9NVL HVQQ UYEY 339S AREB 415Q"
          slotProps={{ htmlInput: { spellCheck: false, autoCapitalize: 'characters' } }}
        />

        <LoadingButton
          size="medium"
          variant="outlined"
          color="inherit"
          loading={busy}
          disabled={!input.trim()}
          onClick={handleAdd}
          startIcon={<Iconify icon="mingcute:add-line" />}
          sx={{ flexShrink: 0 }}
        >
          Add
        </LoadingButton>
      </Box>

      {(error || notice) && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Alert severity={error ? 'error' : 'success'}>{error ?? notice}</Alert>
        </Box>
      )}

      <TableContainer sx={{ px: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Address</TableCell>
              <TableCell align="right">Liquid</TableCell>
              <TableCell align="right">Staked</TableCell>
              <TableCell>Validator</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>

          <TableBody>
            {accounts.map((account) => {
              const isSelf = account.address === signedInAddress;

              return (
                <TableRow key={account.address}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: isSelf ? 700 : 400 }}>
                      {fShortenString(account.address)}
                      {isSelf && (
                        <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                          signed in
                        </Typography>
                      )}
                    </Typography>
                    {!account.onChain && (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        no activity on chain yet
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell align="right">{fShortenNumber(account.liquid).toUpperCase()}</TableCell>
                  <TableCell align="right">{fShortenNumber(account.staked).toUpperCase()}</TableCell>

                  <TableCell>
                    {account.validator ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar src={account.validator.avatar} sx={{ width: 24, height: 24 }} />
                        <Typography variant="body2">{account.validator.name}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                        —
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell align="right">
                    {!isSelf && (
                      <IconButton size="small" onClick={() => handleRemove(account.address)}>
                        <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" sx={{ display: 'block', px: 3, py: 2, color: 'text.secondary' }}>
        Following an address is one-way and needs no signature: it counts towards your total
        here, and your portfolio never appears in its.
      </Typography>
    </Card>
  );
}

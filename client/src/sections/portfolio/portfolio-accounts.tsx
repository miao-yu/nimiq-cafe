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
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import TableContainer from '@mui/material/TableContainer';

import { fNumber } from 'src/utils/format-number';
import { fShortenString } from 'src/utils/format-blockchain';

import axios, { endpoints } from 'src/lib/axios';
import { getSigner } from 'src/lib/nimiq-provider';
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
 * The addresses in this bundle, and the controls to change it.
 *
 * Adding requires signing with the address being added -- that signature is
 * the whole authorisation, which is why there is no "enter an address" field
 * here. You cannot add an address you do not control.
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

  const handleAdd = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const signer = await getSigner();
      const { data: challenge } = await axios.post(endpoints.auth.challenge);
      // The wallet decides which address signs. In a browser that is a picker;
      // inside Nimiq Pay it is the active account.
      const signed = await signer.sign(challenge.message);

      const added = await addPortfolioAddress({
        code: challenge.code,
        publicKey: signed.publicKey,
        signature: signed.signature,
        signer: signed.signer,
      });

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
      <CardHeader
        title={title}
        subheader={subheader}
        action={
          <LoadingButton
            size="small"
            variant="outlined"
            color="inherit"
            loading={busy}
            onClick={handleAdd}
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            Add address
          </LoadingButton>
        }
      />

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

                  <TableCell align="right">{fNumber(account.liquid)}</TableCell>
                  <TableCell align="right">{fNumber(account.staked)}</TableCell>

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
        Addresses here can see each other. Signing in with any of them shows this same portfolio.
      </Typography>
    </Card>
  );
}

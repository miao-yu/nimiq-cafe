import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { RouterLink } from 'src/routes/components';

import { fAddressInfo, fShortenString } from 'src/utils/format-blockchain';

import axios, { endpoints } from 'src/lib/axios';
import { useGetSettings } from 'src/actions/blockchain';
import { DashboardContent } from 'src/layouts/dashboard';
import { SignOutButton } from 'src/layouts/components/sign-out-button';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { EmptyContent } from 'src/components/empty-content';
import CopyToClipboard from 'src/components/utils/copy-to-clipboard';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const PAYOUT_TYPE_RESTAKE_TEXT = 'Restake';
const PAYOUT_TYPE_PAYOUT_TEXT = 'Payout';

export type NewUserSchemaType = zod.infer<typeof NewUserSchema>;

export const NewUserSchema = zod.object({
  payoutType: zod.union([zod.literal(PAYOUT_TYPE_RESTAKE_TEXT), zod.literal(PAYOUT_TYPE_PAYOUT_TEXT)]),
});

// ----------------------------------------------------------------------

export function UserNewEditForm() {
  const { user } = useAuthContext();
  const { settings } = useGetSettings();

  const defaultValues: NewUserSchemaType = {
    payoutType: PAYOUT_TYPE_RESTAKE_TEXT,
  };

  const methods = useForm<NewUserSchemaType>({
    mode: 'onSubmit',
    resolver: zodResolver(NewUserSchema),
    defaultValues,
    values: {
      payoutType: settings?.payoutType || PAYOUT_TYPE_RESTAKE_TEXT,
    },
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  if (!user) {
    return (
      <DashboardContent>
        <EmptyContent
          filled
          title="Loading..."
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  const addressInfo = fAddressInfo(user.address);
  const name = addressInfo ? addressInfo.name : fShortenString(user.address);
  const avatar = addressInfo && addressInfo.logo ? addressInfo.logo : `https://v2.nimiqwatch.com/api/v1/iqon/${user.address.replaceAll(' ', '+')}`;
  const link = `/wallet/${user.address}`;

  const onSubmit = handleSubmit(async (data) => {
    try {
      const response = await axios.post(endpoints.blockchain.settings, {
        payoutType: data.payoutType,
      });
  
      if (response.status === 200) {
        toast.success('Update success!');

        reset({ payoutType: data.payoutType });
      } else {
        toast.error('Failed to update payout type.');
      }
    } catch (error) {
      console.error('Error updating payout type:', error);
      toast.error('An error occurred while updating payout type.');
    }
  });

  const payoutTypes = [
    {
      value: PAYOUT_TYPE_RESTAKE_TEXT,
      label: 'Restake (Compound)',
    },
    {
      value: PAYOUT_TYPE_PAYOUT_TEXT,
      label: 'Direct Payout',
    }
  ];

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ pt: 1, pb: 2 }}>
            <Box
              sx={{
                pt: 2.5,
                display: 'flex',
                alignItems: 'center',
                flexDirection: 'column',
              }}
            >
              <Avatar src={avatar} alt={name} sx={{ width: 96, height: 96 }}>
                {name}
              </Avatar>

              <Typography title={user?.address || ''} variant="h4" noWrap sx={{ mt: 0.5, mb: 0.5 }}>
                <Link 
                  component={RouterLink}
                  href={link} 
                  underline="hover" 
                  color="inherit"
                >
                  {name}
                </Link>
              </Typography>

              <Box component="span">
                <CopyToClipboard title="Address" text={user?.address || ''} />
              </Box>
            </Box>

            {user && (
              <Stack sx={{ alignItems: 'center', justifyContent: 'center', p: 2.5 }}>
                <SignOutButton />
              </Stack>
            )}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ p: 3 }}>
            <Box
              sx={{
                rowGap: 3,
                columnGap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(1, 1fr)' },
              }}
            >
              {user && (
                <Field.Select
                  name="payoutType"
                  label="Payout Type"
                  slotProps={{
                    select: { native: true },
                    inputLabel: { shrink: true },
                  }}
                >
                  {payoutTypes.map((payoutType) => (
                    <option key={payoutType.value} value={payoutType.value}>
                      {payoutType.label}
                    </option>
                  ))}
                </Field.Select>
              )}
            </Box>

            <Stack sx={{ mt: 3, alignItems: 'flex-end' }}>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                Save changes
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}

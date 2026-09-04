import type { IWalletItem } from 'src/types/blockchain';

import { varAlpha } from 'minimal-shared/utils';

import Typography from '@mui/material/Typography';
import { Box, Button, cardClasses } from '@mui/material';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fAddressInfo } from 'src/utils/format-blockchain';
import { fNumber, fPercent, fShortenNumber } from 'src/utils/format-number';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { CourseReminders } from 'src/sections/overview/course/course-reminders';
import { CourseMyAccount } from 'src/sections/overview/course/course-my-account';

import { WalletStakers } from '../wallet-stakers';
import { Transactions } from '../../block/transactions';
import { AppWidgetSimple } from '../../../overview/app/app-widget-simple';
import { TransactionAccount } from '../../transaction/transaction-account';

// ----------------------------------------------------------------------

type Props = {
  wallet: IWalletItem | null;
  error: any;
  loading: boolean;
};

export function WalletView({ wallet, error, loading }: Props) {
  if (loading || !wallet) {
    return (
      <DashboardContent maxWidth={false}>
        <EmptyContent
          filled
          title="Loading..."
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  if (error) {
    return (
      <DashboardContent maxWidth={false}>
        <EmptyContent
          filled
          title="Wallet not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.staking}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to list
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  const addressInfo = fAddressInfo(wallet.account.address);
  const name = addressInfo ? addressInfo.name : wallet.account.name;
  const avatar = addressInfo && addressInfo.logo ? addressInfo.logo : wallet.account.avatar;

  let validatorName = '';
  let validatorAvatar = '';
  if (wallet.validator) {
    const validatorAddressInfo = fAddressInfo(wallet.validator.rewardAddress);
    validatorName = validatorAddressInfo ? validatorAddressInfo.name : wallet.validator.rewardName;
    validatorAvatar = validatorAddressInfo && validatorAddressInfo.logo ? validatorAddressInfo.logo : wallet.validator.rewardAvatar;
  }

  const balance = {
    totalBalance: wallet.staker?.totalBalance || wallet.account.walletBalance,
    stakingBalance: wallet.staker?.stakingBalance || 0,
    walletBalance: wallet.account.walletBalance,
    inactiveBalance: wallet.staker?.inactiveBalance || 0,
  };

  return (
    <DashboardContent
      maxWidth={false}
      disablePadding
      sx={[
        (theme) => ({
          borderTop: { lg: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}` },
        }),
      ]}
    >
      <Box sx={{ display: 'flex', flex: '1 1 auto', flexDirection: { xs: 'column', lg: 'row' } }}>
        <Box
          sx={[
            (theme) => ({
              gap: 3,
              display: 'flex',
              minWidth: { lg: 0 },
              py: { lg: 3, xl: 5 },
              flexDirection: 'column',
              flex: { lg: '1 1 auto' },
              px: { xs: 2, sm: 3, xl: 5 },
              borderRight: {
                lg: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}`,
              },
            }),
          ]}
        >
          <Box sx={{ mb: 2 }}>
            <Typography title={`Hi, ${wallet.account.name} 👋`} variant="h4" component="h1" sx={{ mb: 1 }}>
            {`${name} - Wallet`} 👋
            </Typography>
            <Typography
              sx={{ color: 'text.secondary' }}
            >{`Discover in-depth information about individual Nimiq wallets with ${CONFIG.appName}.`}</Typography>
          </Box>

          {wallet.transactions.length > 0 && (
            <Box
              sx={{
                gap: 3,
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(1, 1fr)' },
              }}
            >
              <Transactions
                title="Transactions"
                data={wallet.transactions}
              />
            </Box>
            )
          }

          {wallet.validator && (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' },
                  gap: 3,
                }}
              >
                {/* Left Section */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateRows: 'repeat(2, 1fr)',
                    gap: 3,
                  }}
                >
                  <AppWidgetSimple
                    title="Staked NIM"
                    text={`${fShortenNumber(wallet.validator.balance).toUpperCase()} (${fPercent(wallet.validator.balanceShare)})`}
                    color="error"
                  />
                  <AppWidgetSimple
                    title="Stakers"
                    text={`${fNumber(wallet.validator.numStakers)} (${fPercent(wallet.validator.numStakersShare)})`}
                    color="success"
                  />
                </Box>

                {/* Right Section */}
                <TransactionAccount
                  title="Reward Address"
                  name={validatorName}
                  address={wallet.validator.rewardAddress}
                  avatar={validatorAvatar}
                  link={wallet.validator.rewardAddressLink}
                />
              </Box>

              <Box
                sx={{
                  gap: 3,
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(1, 1fr)' },
                }}
              >
                <WalletStakers
                title="Stakers"
                data={wallet.validator.stakers}
                />
              </Box>
            </>
            )
          }
        </Box>

        <Box
          sx={{
            width: 1,
            display: 'flex',
            flexDirection: 'column',
            px: { xs: 2, sm: 3, xl: 5 },
            pt: { lg: 8, xl: 10 },
            pb: { xs: 8, xl: 10 },
            flexShrink: { lg: 0 },
            gap: { xs: 3, lg: 5, xl: 8 },
            maxWidth: { lg: 320, xl: 360 },
            bgcolor: { lg: 'background.neutral' },
            [`& .${cardClasses.root}`]: {
              p: { xs: 3, lg: 0 },
              boxShadow: { lg: 'none' },
              bgcolor: { lg: 'transparent' },
            },
          }}
        >
          <CourseMyAccount name={name} address={wallet.account.address} avatar={avatar} />

          <CourseReminders title="Balance" balance={balance} />
        </Box>
      </Box>
    </DashboardContent>
  );
}

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { fNumber, fPercent, fCurrency, fShortenNumber } from 'src/utils/format-number';
import { fPoSSupplyAt, TOTAL_SUPPLY, fCalcStakingRewards } from 'src/utils/format-blockchain';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetPriceInfo, useGetStakedInfo, useGetSupplyCurve, useGetActiveAccounts, useGetDailyStakedinfo, useGetTodayActiveUsers, useGetElectedValidators, useGetDailyTransactions, useGetDailyFastspotInfo, useGetDailySocialmediaInfo } from 'src/actions/blockchain';

import { BlockSize } from '../block-size';
import { TransactionFees } from '../transaction-fees';
import { DailyActiveUsers } from '../daily-active-users';
import { FutureSupplyCurve } from '../future-supply-curve';
import { CourseProgress } from '../../course/course-progress';
import { AppWidgetSimple } from '../../app/app-widget-simple';
import { AppAreaInstalled } from '../../app/app-area-installed';
import { EcommerceYearlySales } from '../ecommerce-yearly-sales';
import { EcommerceBestSalesman } from '../ecommerce-best-salesman';
import { BookingAvailable } from '../../booking/booking-available';
import { AppCurrentDownload } from '../../app/app-current-download';
import { EcommerceWidgetSummary } from '../ecommerce-widget-summary';
import { BlockchainRealtimeColumns } from '../blockchain-realtime-columns';
import { AnalyticsCurrentVisits } from '../../analytics/analytics-current-visits';

// ----------------------------------------------------------------------

export function OverviewEcommerceView() {
  const theme = useTheme();

  const { electedValidators } = useGetElectedValidators();
  const { stakedInfo } = useGetStakedInfo();
  const { dailyTransactions } = useGetDailyTransactions();
  const { priceInfo } = useGetPriceInfo();
  const { dailyStakedinfo } = useGetDailyStakedinfo();
  const { dailySocialmediaInfo } = useGetDailySocialmediaInfo();
  const { dailyFastspotInfo } = useGetDailyFastspotInfo();
  const { todayActiveUsers } = useGetTodayActiveUsers();
  const { activeAccounts } = useGetActiveAccounts();
  const { supplyCurve } = useGetSupplyCurve();

  const dates = dailyTransactions?.dailyActiveUsers.map((dailyActiveUser) => dailyActiveUser.date.slice(5));
  const stakedDates = dailyStakedinfo?.dailyTotalStaked.map((dailyStaked) => dailyStaked.date.slice(5));

  const lastDayTotalStakers = dailyStakedinfo?.dailyStakers[dailyStakedinfo?.dailyStakers.length - 1].value;
  const totalStakersPercent = (stakedInfo?.network.totalStakers && lastDayTotalStakers) ? (stakedInfo?.network.totalStakers - lastDayTotalStakers) / lastDayTotalStakers * 100 : 0;
  
  const lastDayTotalValidators = dailyStakedinfo?.dailyValidators[dailyStakedinfo?.dailyValidators.length - 1].value;
  const totalValidatorsPercent = (stakedInfo?.network.totalValidators && lastDayTotalValidators) ? (stakedInfo?.network.totalValidators - lastDayTotalValidators) / lastDayTotalValidators * 100 : 0;
  
  const lastDayTotalStaked = dailyStakedinfo?.dailyTotalStaked[dailyStakedinfo?.dailyTotalStaked.length - 1].value;
  const totalStakedPercent = (stakedInfo?.network.totalBalance && lastDayTotalStaked) ? (stakedInfo?.network.totalBalance - lastDayTotalStaked) / lastDayTotalStaked * 100 : 0;

  const now = new Date();
  const currentSupply = fPoSSupplyAt(now.getTime());
  const remainingSupply = (TOTAL_SUPPLY / 100000) - currentSupply;

  const latestPriceInfo = priceInfo[priceInfo.length - 1];
  const priceInfoDatetimes = priceInfo.map((priceInfoElement) => priceInfoElement.datetime);

  const firstPriceInfo = priceInfo[0];
  const marketCapChange = (latestPriceInfo?.marketCap - firstPriceInfo?.marketCap) / firstPriceInfo?.marketCap * 100;

  const socialmediaDates = dailySocialmediaInfo?.dailyCMCRank.map((dailyRank) => dailyRank.date.slice(5));

  const lastDayCMCRank = dailySocialmediaInfo?.dailyCMCRank[dailySocialmediaInfo?.dailyCMCRank.length - 1].value;
  const previousDayCMCRank = dailySocialmediaInfo?.dailyCMCRank[dailySocialmediaInfo?.dailyCMCRank.length - 2].value;
  const cmcRankChange = (lastDayCMCRank && previousDayCMCRank) ? (previousDayCMCRank - lastDayCMCRank) / previousDayCMCRank * 100 : 0;

  const lastDayTGMembers = dailySocialmediaInfo?.dailyTGMembers[dailySocialmediaInfo?.dailyTGMembers.length - 1].value;
  const previousDayTGMembers = dailySocialmediaInfo?.dailyTGMembers[dailySocialmediaInfo?.dailyTGMembers.length - 2].value;
  const tgMembersChange = (lastDayTGMembers && previousDayTGMembers) ? (lastDayTGMembers - previousDayTGMembers) / previousDayTGMembers * 100 : 0;

  const lastDayXFollowers = dailySocialmediaInfo?.dailyXFollowers[dailySocialmediaInfo?.dailyXFollowers.length - 1].value;
  const previousDayXFollowers = dailySocialmediaInfo?.dailyXFollowers[dailySocialmediaInfo?.dailyXFollowers.length - 2].value;
  const xFollowersChange = (lastDayXFollowers && previousDayXFollowers) ? (lastDayXFollowers - previousDayXFollowers) / previousDayXFollowers * 100 : 0;

  const dailyFastspotData = dailyFastspotInfo.slice(-14);
  const fastspotDates = dailyFastspotData.map((dailyFastspot) => dailyFastspot.date.slice(5));
  const nimbtcTransactions = dailyFastspotData.reduce((acc, dailyFastspot) => acc + dailyFastspot.nimbtcCount, 0);
  const btcusdcTransactions = dailyFastspotData.reduce((acc, dailyFastspot) => acc + dailyFastspot.btcusdcCount, 0);
  const btcusdtTransactions = dailyFastspotData.reduce((acc, dailyFastspot) => acc + dailyFastspot.btcusdtCount, 0);
  const nimeusdtTransactions = dailyFastspotData.reduce((acc, dailyFastspot) => acc + dailyFastspot.nimusdtCount, 0);
  const nimusdcTransactions = dailyFastspotData.reduce((acc, dailyFastspot) => acc + dailyFastspot.nimusdcCount, 0);

  const oneDayAfter = new Date(now.getTime() + 24 * 60 * 60 * 1000).getTime();
  const oneYearAfter = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).getTime();
  const endSupplyAfterDay = fPoSSupplyAt(oneDayAfter);
  const endSupplyAfterYear = fPoSSupplyAt(oneYearAfter);
  const circulatingSupplyStaked = stakedInfo?.network.totalBalance ? (stakedInfo.network.totalBalance / currentSupply * 100) : 55;

  const {rewardPercentage} = fCalcStakingRewards({
    startSupply: currentSupply,
    endSupply: endSupplyAfterYear,
    circulatingSupplyStaked,
    personalStaked: 100000,
    stakingPeriod: 365,
    poolFee: 0,
    price: 1,
  });

  const next24HRewards = endSupplyAfterDay - currentSupply;
  const next1YSupplyGrowth = endSupplyAfterYear - currentSupply;
  const inflation = next1YSupplyGrowth / currentSupply * 100;

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h2" component="h1" sx={{ mb: 1 }}>
        Nimiq Network Stats 👋
      </Typography>
      <Typography
        sx={{ color: 'text.secondary', mb: 2 }}
      >🎉 Your Gateway to Real-Time Nimiq Blockchain Insights! 🎉</Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <EcommerceWidgetSummary
            title="Price"
            percent={latestPriceInfo?.priceChange || 0}
            text={fCurrency(latestPriceInfo?.price || 0, { style: 'currency', currency: 'USD', maximumFractionDigits: 6 })}
            chart={{
              categories: priceInfoDatetimes || [],
              series: priceInfo.map((price) => price.price) || [],
              numberFormat: 'original',
              numberStyle: 'currency',
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <EcommerceWidgetSummary
            title="Volume"
            percent={latestPriceInfo?.volumeChange || 0}
            text={fShortenNumber(latestPriceInfo?.volume || 0, { style: 'currency', currency: 'USD' }).toUpperCase()}
            chart={{
              colors: [theme.palette.warning.light, theme.palette.warning.main],
              categories: priceInfoDatetimes || [],
              series: priceInfo.map((price) => price.volume) || [],
              numberFormat: 'short',
              numberStyle: 'currency',
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <EcommerceWidgetSummary
            title="Market Cap"
            percent={marketCapChange || 0}
            text={fShortenNumber(latestPriceInfo?.marketCap || 0, { style: 'currency', currency: 'USD' }).toUpperCase()}
            chart={{
              colors: [theme.palette.error.light, theme.palette.error.main],
              categories: priceInfoDatetimes || [],
              series: priceInfo.map((price) => price.marketCap) || [],
              numberFormat: 'short',
              numberStyle: 'currency',
            }}
          />
        </Grid>

        <BlockchainRealtimeColumns/>

        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
          <EcommerceYearlySales
            title="Daily Transactions"
            chart={{
              categories: dates?.slice(-14) || [],
              series: [
                {
                  name: 'Daily',
                  data: [
                    {
                      name: 'TX',
                      data: dailyTransactions?.dailyTXs.slice(-14).map((element) => element.value) || [],
                    },
                    {
                      name: 'TX Volume',
                      data: dailyTransactions?.dailyTXVolume.slice(-14).map((element) => element.value) || [],
                    },
                  ],
                }
              ],
              options: {
                yaxis: [
                  {
                    title: {
                      text: 'Transactions',
                    },
                    labels: {
                      formatter: (value) => `${fShortenNumber(value).toUpperCase()}`,
                    },
                  },
                  {
                    opposite: true,
                    title: {
                      text: 'Transactions Volume',
                    },
                    labels: {
                      formatter: (value) => `${fShortenNumber(value).toUpperCase()}`,
                    },
                  },
                ]
              },
            }}
          />
        </Grid>
        
        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
          <EcommerceYearlySales
            title="Daily TPS"
            chart={{
              categories: dates?.slice(-14) || [],
              series: [
                {
                  name: 'Daily',
                  data: [
                    {
                      name: 'Average TPS',
                      data: dailyTransactions?.dailyTPS.slice(-14).map((element) => element.value) || [],
                    },
                    {
                      name: 'Burst TPS',
                      data: dailyTransactions?.dailyBurstTPS.slice(-14).map((element) => element.value) || [],
                    },
                  ],
                }
              ],
              colors: [theme.palette.info.main, theme.palette.error.main],
              options: {
                yaxis: [
                  {
                    title: {
                      text: 'Average TPS',
                    },
                    labels: {
                      formatter: (value) => `${fNumber(value)}`,
                    },
                  },
                  {
                    opposite: true,
                    title: {
                      text: 'Burst TPS',
                    },
                    labels: {
                      formatter: (value) => `${fNumber(value)}`,
                    },
                  },
                ]
              },
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <EcommerceWidgetSummary
            title="Validators"
            percent={totalValidatorsPercent}
            text={fNumber(stakedInfo?.network.totalValidators || 0)}
            chart={{
              categories: stakedDates || [],
              series: dailyStakedinfo?.dailyValidators.map((dailyValidator) => dailyValidator.value) || [],
              numberFormat: 'normal',
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <EcommerceWidgetSummary
            title="Total Staked NIM"
            percent={totalStakedPercent}
            text={fShortenNumber(stakedInfo?.network.totalBalance || 0).toUpperCase()}
            chart={{
              colors: [theme.palette.warning.light, theme.palette.warning.main],
              categories: stakedDates || [],
              series: dailyStakedinfo?.dailyTotalStaked.map((dailyStaked) => dailyStaked.value) || [],
              numberFormat: 'short',
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <EcommerceWidgetSummary
            title="Total Stakers"
            percent={totalStakersPercent}
            text={fNumber(stakedInfo?.network.totalStakers || 0)}
            chart={{
              colors: [theme.palette.error.light, theme.palette.error.main],
              categories: stakedDates || [],
              series: dailyStakedinfo?.dailyStakers.map((dailyStaker) => dailyStaker.value) || [],
              numberFormat: 'normal',
            }}
          />
        </Grid>
        
        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
          {electedValidators && (
            <EcommerceBestSalesman
              title="Elected Validators"
              tableData={electedValidators}
              headCells={[
                { id: 'validators', label: 'Validators' },
                { id: 'stakers', label: 'Stakers', align: 'center' },
                { id: 'slots', label: 'Slots', align: 'center' },
                { id: 'staked NIM', label: 'Staked NIM', align: 'right' },
                { id: 'rank', label: 'Rank', align: 'right' },
              ]}
            />
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
          <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
            {electedValidators && (
              <AnalyticsCurrentVisits
                title="Share of Staked NIM"
                chart={{
                  series: electedValidators.map((validator) => ({
                    label: validator.name,
                    value: validator.balance,
                  })),
                }}
              />
            )}

            {electedValidators && (
              <AnalyticsCurrentVisits
                title="Share of Stakers"
                chart={{
                  series: electedValidators.map((validator) => ({
                    label: validator.name,
                    value: validator.numStakers,
                  })),
                }}
              />
            )}
          </Box>
        </Grid>
        
        <Grid size={{ xs: 6, md: 3 }}>
          <AppWidgetSimple
            title="APY"
            text={fPercent(rewardPercentage)}
          />
        </Grid>

        <Grid size={{ xs: 6, md: 3 }}>
          <AppWidgetSimple
            title="24H Rewards"
            text={`${fShortenNumber(next24HRewards).toUpperCase()} NIM`}
          />
        </Grid>

        <Grid size={{ xs: 6, md: 3 }}>
          <AppWidgetSimple
            title="Inflation"
            text={fPercent(inflation)}
          />
        </Grid>

        <Grid size={{ xs: 6, md: 3 }}>
          <AppWidgetSimple
            title="1Y Supply Growth"
            text={fShortenNumber(next1YSupplyGrowth).toUpperCase()}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <FutureSupplyCurve
            title="5 Years Supply Curve"
            data={supplyCurve.map((supplyData) => supplyData.supply)}
            categories={supplyCurve.map((supplyData) => supplyData.datetime)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <BookingAvailable
            title="Supply"
            chart={{
              series: [
                { label: 'Current Supply', value: currentSupply },
                { label: 'Remaining Supply', value: remainingSupply },
              ],
            }}
          />
        </Grid>
        
        <Grid size={{ xs: 12, md: 4 }}>
          <EcommerceWidgetSummary
            title="CMC Rank"
            percent={cmcRankChange}
            text={fNumber(lastDayCMCRank || 0)}
            chart={{
              categories: socialmediaDates || [],
              series: dailySocialmediaInfo?.dailyCMCRank.map((dailyRank) => dailyRank.value) || [],
              numberFormat: 'normal',
              options: {
                yaxis: { reversed: true }
              }
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <EcommerceWidgetSummary
            title="Twitter Followers"
            percent={xFollowersChange}
            text={fShortenNumber(lastDayXFollowers || 0).toUpperCase()}
            chart={{
              colors: [theme.palette.warning.light, theme.palette.warning.main],
              categories: socialmediaDates || [],
              series: dailySocialmediaInfo?.dailyXFollowers.map((dailyXFollower) => dailyXFollower.value) || [],
              numberFormat: 'short',
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <EcommerceWidgetSummary
            title="Telegram Members"
            percent={tgMembersChange}
            text={fShortenNumber(lastDayTGMembers || 0).toUpperCase()}
            chart={{
              colors: [theme.palette.error.light, theme.palette.error.main],
              categories: socialmediaDates || [],
              series: dailySocialmediaInfo?.dailyTGMembers.map((dailyTGMember) => dailyTGMember.value) || [],
              numberFormat: 'short',
            }}
          />
        </Grid>

        
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AppCurrentDownload
            title="Fastspot Transactions"
            subheader={`In the last ${fastspotDates.length} days`}
            chart={{
              series: [
                { label: 'NIM/BTC', value: nimbtcTransactions },
                { label: 'BTC/USDT', value: btcusdtTransactions },
                { label: 'BTC/USDC', value: btcusdcTransactions },
                { label: 'NIM/USDT', value: nimeusdtTransactions },
                { label: 'NIM/USDC', value: nimusdcTransactions },
              ],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <AppAreaInstalled
            title="Fastspot Volume"
            //subheader="(+43%) than the same day last week"
            subheader={`In the last ${fastspotDates.length} days`}
            chart={{
              categories: fastspotDates || [],
              series: [
                {
                  name: 'Daily',
                  data: [
                    { name: 'NIM/BTC', data: dailyFastspotData.map((dailyFastspot) => dailyFastspot.nimbtcVolume) },
                    { name: 'BTC/USDT', data: dailyFastspotData.map((dailyFastspot) => dailyFastspot.btcusdtVolume) },
                    { name: 'BTC/USDC', data: dailyFastspotData.map((dailyFastspot) => dailyFastspot.btcusdcVolume) },
                    { name: 'NIM/USDT', data: dailyFastspotData.map((dailyFastspot) => dailyFastspot.nimusdtVolume) },
                    { name: 'NIM/USDC', data: dailyFastspotData.map((dailyFastspot) => dailyFastspot.nimusdcVolume) },
                  ],
                },
              ],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <AppWidgetSimple
            title="Monthly Active Accounts"
            text={fNumber(activeAccounts?.lastMonth || 0)}
            color="error"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <AppWidgetSimple
            title="Yearly Active Accounts"
            text={fNumber(activeAccounts?.lastYear || 0)}
            color="error"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <AppWidgetSimple
            title="Total Accounts"
            text={fNumber(activeAccounts?.total || 0)}
            color="error"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <DailyActiveUsers
            title="Daily Active Accounts"
            chart={{
              series: [
                {
                  name: 'Daily',
                  categories: dates || [],
                  data: [{ data: dailyTransactions?.dailyActiveUsers.map((dailyActiveUser) => dailyActiveUser.value) || [] }],
                }
              ],
              colors: [theme.palette.primary.main],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <CourseProgress
            title="Today's Active Accounts"
            chart={{
              series: [
                { label: 'Senders', value: todayActiveUsers?.totalSenders || 0 },
                { label: 'Receivers', value: todayActiveUsers?.totalReceivers || 0 },
              ],
            }}
          />
        </Grid>
 
        <Grid size={{ xs: 12, md: 6 }}>
          <BlockSize
            title="Daily Block Size"
            data={dailyTransactions?.dailyBlockSizes.slice(-14).map((dailyBlockSize) => dailyBlockSize.value) || []}
            categories={dates?.slice(-14) || []}
            colors={[theme.palette.error.main]}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TransactionFees
            title="Daily Transaction Fees"
            data={dailyTransactions?.dailyFees.slice(-14).map((dailyFee) => dailyFee.value) || []}
            categories={dates?.slice(-14) || []}
            colors={[theme.palette.warning.main]}
          />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}

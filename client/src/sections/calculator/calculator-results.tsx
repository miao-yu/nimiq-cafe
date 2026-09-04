import type { CalculatorSummary } from 'src/utils/staking-rewards';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { fNumber, fPercent, fShortenNumber } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type TileProps = {
  label: string;
  value: string;
  hint?: string;
};

function Tile({ label, value, hint }: TileProps) {
  return (
    <Card sx={{ p: 2.5, textAlign: 'center' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>

      <Typography variant="h5" sx={{ mt: 0.5 }} title={hint}>
        {value}
      </Typography>
    </Card>
  );
}

// ----------------------------------------------------------------------

type Props = {
  summary: CalculatorSummary;
  sign: string;
  stakingAmount: number;
};

export function CalculatorResults({ summary, sign, stakingAmount }: Props) {
  const monthly = summary.rewards.find((reward) => reward.unit === 'Month');
  const daily = summary.rewards.find((reward) => reward.unit === 'Day');

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          gap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        }}
      >
        <Tile
          label="Reward per month"
          hint="Total rewarded, net of the pool fee"
          value={`${sign} ${fNumber(monthly?.rewardsValue ?? 0)}`}
        />
        <Tile label="Reward per day" value={fPercent(daily?.rewardPercentage ?? 0)} />
        <Tile
          label="Total staked"
          hint="Estimated total staked across the network"
          value={`${fShortenNumber(summary.totalStaked)} NIM`}
        />
        <Tile
          label="Circulating supply"
          hint="Estimated circulating supply"
          value={`${fShortenNumber(summary.circulatingSupply)} NIM`}
        />
      </Box>

      <Card>
        {summary.rewards.map((reward, index) => (
          <Box key={reward.unit}>
            {index > 0 && <Divider sx={{ borderStyle: 'dashed' }} />}

            <Box
              sx={{
                p: 3,
                gap: 2,
                display: 'grid',
                alignItems: 'center',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Reward per {reward.unit.toLowerCase()}
                </Typography>

                <Typography variant="h6">
                  {sign} {fNumber(reward.rewardsValue)}
                </Typography>

                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  Pool fee {sign} {fNumber(reward.poolFeeValue)} / {fNumber(reward.totalPoolFeeNIM)} NIM
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Rewarded / {reward.unit}
                </Typography>

                <Typography variant="h6">{fNumber(reward.totalRewards)} NIM</Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Percentage / {reward.unit}
                </Typography>

                <Typography variant="h6">{fPercent(reward.rewardPercentage)}</Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Card>

      <Stack spacing={1}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          * You have a {fPercent(summary.soloStakingProbability)} chance of being elected as a solo
          validator with {fNumber(stakingAmount)} NIM staked.
        </Typography>

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          * The calculation assumes approximately {fShortenNumber(summary.totalStaked)} NIM staked in
          total.
        </Typography>

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          * This is a rough estimate based on the current Nimiq network.
        </Typography>
      </Stack>
    </Stack>
  );
}

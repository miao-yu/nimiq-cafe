// Nimiq PoS supply and staking-reward math.
//
// Ported from the v1 site (public/javascripts/custom/calc.js), which the
// /calculator page replaces. The constants and the epoch loop are kept exactly
// as they were so the new page reports the same numbers as the old one.

// ----------------------------------------------------------------------

const TOTAL_SUPPLY = 21e14;
const PROOF_OF_STAKE_FORK_DATE = new Date('2024-11-19T16:45:20.000Z');
const SUPPLY_AT_PROOF_OF_STAKE_FORK_DATE = 12893109654.06244;
const SUPPLY_DECAY = 0.9999999999960264;

/** One epoch is half a day, which sets the compounding interval below. */
export const EPOCH_DURATION_DAYS = 0.5;

/** Validator slots in an election, used for the solo-staking probability. */
export const VALIDATOR_SLOTS = 512;

// ----------------------------------------------------------------------

/** Integer power by squaring; the decay exponent is far too large for `**`. */
function powi(base: number, exponent: number): number {
  let x = base;
  let n = exponent;

  if (n < 0) {
    x = 1 / x;
    n *= -1;
  }

  if (!n) return 1;

  let y = 1;

  while (n > 1) {
    if (n % 2) {
      y *= x;
      n -= 1;
    }
    x *= x;
    n /= 2;
  }

  return x * y;
}

/** Total NIM in circulation at a given moment, per the PoS supply curve. */
export function posSupplyAt(timestampMs: number): number {
  const ts = timestampMs - PROOF_OF_STAKE_FORK_DATE.getTime();

  if (ts < 0) {
    throw new Error('timestamp must be greater or equal to the PoS fork date');
  }

  return Math.round(
    (TOTAL_SUPPLY - (TOTAL_SUPPLY - SUPPLY_AT_PROOF_OF_STAKE_FORK_DATE * 1e5) * powi(SUPPLY_DECAY, ts)) / 1e5
  );
}

/**
 * Probability of winning at least one of the election slots, i.e. the chance of
 * being elected as a solo validator with this stake.
 */
export function calculateElectedProbability(
  totalStaked: number,
  personalStaked: number,
  slots: number = VALIDATOR_SLOTS
): number {
  const probabilityElected = personalStaked / totalStaked;
  const probabilityNotElected = 1 - probabilityElected;

  return (1 - probabilityNotElected ** slots) * 100;
}

// ----------------------------------------------------------------------

export type StakingRewardsParams = {
  startSupply: number;
  endSupply: number;
  circulatingSupplyStaked: number;
  personalStaked: number;
  stakingPeriod: number;
  poolFee: number;
  price: number;
  restake?: boolean;
};

export type StakingRewards = {
  /** NIM rewarded over the period, net of the pool fee. */
  totalRewards: number;
  /** Value of those rewards in the selected currency. */
  rewardsValue: number;
  /** NIM taken as pool fee over the period. */
  totalPoolFeeNIM: number;
  /** Value of the pool fee in the selected currency. */
  poolFeeValue: number;
  /** Net rewards as a percentage of the amount staked. */
  rewardPercentage: number;
};

/**
 * Walks the period epoch by epoch, growing the personal stake when restaking is
 * on and the network stake as new supply is issued.
 */
export function calculateStakingRewards({
  startSupply,
  endSupply,
  circulatingSupplyStaked,
  personalStaked,
  stakingPeriod,
  poolFee,
  price,
  restake = true,
}: StakingRewardsParams): StakingRewards {
  let totalStaked = (startSupply * circulatingSupplyStaked) / 100;

  const epochs = Math.floor(stakingPeriod / EPOCH_DURATION_DAYS);
  const newSupplyPerEpoch = (endSupply - startSupply) / epochs;

  let totalRewards = 0;
  let totalPoolFeeNIM = 0;
  let currentPersonalStaked = personalStaked;

  for (let i = 0; i < epochs; i += 1) {
    const personalGrossRewards = newSupplyPerEpoch * (currentPersonalStaked / totalStaked);
    const personalPoolFee = personalGrossRewards * (poolFee / 100);
    const personalNetRewards = personalGrossRewards - personalPoolFee;

    if (restake) {
      currentPersonalStaked += personalNetRewards;
    }

    totalRewards += personalNetRewards;
    totalPoolFeeNIM += personalPoolFee;
    totalStaked += (newSupplyPerEpoch * circulatingSupplyStaked) / 100;
  }

  return {
    totalRewards,
    rewardsValue: totalRewards * price,
    totalPoolFeeNIM,
    poolFeeValue: totalPoolFeeNIM * price,
    rewardPercentage: (totalRewards / personalStaked) * 100,
  };
}

// ----------------------------------------------------------------------

export type RewardPeriod = {
  unit: string;
  days: number;
};

/** The four horizons the calculator reports, matching the v1 layout. */
export const REWARD_PERIODS: RewardPeriod[] = [
  { unit: 'Day', days: 1 },
  { unit: 'Week', days: 7 },
  { unit: 'Month', days: 30.5 },
  { unit: 'Year', days: 365 },
];

export type RewardBreakdown = RewardPeriod & StakingRewards;

export type CalculatorSummary = {
  circulatingSupply: number;
  totalStaked: number;
  soloStakingProbability: number;
  rewards: RewardBreakdown[];
};

/** Runs every period through the reward model off one shared starting supply. */
export function calculateRewardSummary(params: {
  stakingAmount: number;
  circulatingSupplyStaked: number;
  poolFee: number;
  price: number;
  restake: boolean;
  now?: number;
}): CalculatorSummary {
  const { stakingAmount, circulatingSupplyStaked, poolFee, price, restake, now = Date.now() } = params;

  const startSupply = posSupplyAt(now);
  const totalStaked = (startSupply * circulatingSupplyStaked) / 100;

  const rewards = REWARD_PERIODS.map((period) => ({
    ...period,
    ...calculateStakingRewards({
      startSupply,
      endSupply: posSupplyAt(now + period.days * 24 * 60 * 60 * 1000),
      circulatingSupplyStaked,
      personalStaked: stakingAmount,
      stakingPeriod: period.days,
      poolFee,
      price,
      restake,
    }),
  }));

  return {
    circulatingSupply: startSupply,
    totalStaked,
    soloStakingProbability: calculateElectedProbability(totalStaked, stakingAmount),
    rewards,
  };
}

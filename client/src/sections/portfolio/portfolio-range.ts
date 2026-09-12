import type { IPortfolioHistoryPoint } from 'src/types/portfolio';

import { fNumber, fCurrency, fShortenNumber } from 'src/utils/format-number';

// ----------------------------------------------------------------------

/**
 * Only compact a fiat figure once the digits stop carrying meaning.
 *
 * A portfolio is usually four or five digits, where "$27.5K" throws away the
 * part someone is actually reading -- they know roughly what they hold and are
 * looking for the exact number. Past a million the digits are noise and the
 * axis has no room for them, so it switches. NIM amounts compact much sooner,
 * because they run to tens of millions and nobody reads those digit by digit.
 */
const COMPACT_USD_ABOVE = 1_000_000;

/** For axes: no cents, they never fit and never help at that size. */
export function formatUsdAxis(value: number): string {
  return Math.abs(value) >= COMPACT_USD_ABOVE
    ? `$${fShortenNumber(value).toUpperCase()}`
    : fCurrency(value, { maximumFractionDigits: 0 });
}

/** For tooltips: the exact figure, which is the reason to hover. */
export function formatUsdExact(value: number): string {
  return Math.abs(value) >= COMPACT_USD_ABOVE
    ? `$${fShortenNumber(value).toUpperCase()}`
    : fCurrency(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * The compact NIM figure, shared by chart axes, the stat cards and the Value
 * over time tooltip.
 *
 * One function rather than three copies: the Total card and that tooltip drifted
 * apart -- 4.59M NIM against 4,590,000 NIM for the same holding -- precisely
 * because the view kept its own identical helper.
 */
export function formatNimShort(value: number): string {
  return `${fShortenNumber(value).toUpperCase()} NIM`;
}

export function formatNimExact(value: number): string {
  return `${fNumber(value)} NIM`;
}

export type PortfolioRange = '1W' | '1M' | '3M' | '6M' | '1Y';

export const PORTFOLIO_RANGES: PortfolioRange[] = ['1W', '1M', '3M', '6M', '1Y'];

const RANGE_DAYS: Record<PortfolioRange, number> = {
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};

/**
 * A year or more is too many days to label individually, so those axes drop
 * to month and year. Below that the day is the point of the chart.
 */
export function isLongRange(range: PortfolioRange): boolean {
  return range === '1Y';
}

export function formatRangeDate(date: string, range: PortfolioRange): string {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString('en-US',
    isLongRange(range) ? { month: 'short', year: 'numeric' } : { month: 'short', day: 'numeric' });
}

/** A day label without the year, for axes where the year is noise. */
export function formatDayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);

  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Rows are `{ date: 'YYYY-MM-DD' }`; comparing the strings is enough. */
export function withinRange<T extends { date: string }>(rows: T[], range: PortfolioRange): T[] {
  const days = RANGE_DAYS[range];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffKey = cutoff.toISOString().slice(0, 10);

  return rows.filter((row) => row.date >= cutoffKey);
}

// ----------------------------------------------------------------------

export function pointNim(point: IPortfolioHistoryPoint): number {
  return point.liquid + point.staked + point.inactive + point.retired;
}

/**
 * A day is worth what NIM was worth that day, which is the whole point of
 * plotting value rather than balance. A day whose price was not recorded
 * carries the last one forward rather than counting as zero, which would draw
 * a cliff that never happened.
 */
export function toUsdSeries(
  points: IPortfolioHistoryPoint[],
  fallbackPrice: number | null
): { date: string; usd: number; nim: number }[] {
  let lastPrice = fallbackPrice;

  return points.map((point) => {
    if (point.nimUsd !== null) {
      lastPrice = point.nimUsd;
    }
    const nim = pointNim(point);

    return { date: point.date, usd: lastPrice === null ? 0 : nim * lastPrice, nim };
  });
}

export type BalanceChange = {
  usd: number;
  nim: number;
  percent: number | null;
};

/**
 * What the range did to the portfolio: last point against first.
 *
 * Needs two points to mean anything -- with one snapshot there is no "change",
 * and reporting the whole balance as a gain would be a lie on day one.
 */
export function balanceChange(
  points: IPortfolioHistoryPoint[],
  range: PortfolioRange,
  fallbackPrice: number | null
): BalanceChange | null {
  const series = toUsdSeries(withinRange(points, range), fallbackPrice);

  if (series.length < 2) {
    return null;
  }

  const first = series[0];
  const last = series[series.length - 1];

  return {
    usd: last.usd - first.usd,
    nim: last.nim - first.nim,
    percent: first.usd > 0 ? ((last.usd - first.usd) / first.usd) * 100 : null,
  };
}

/** Rewards earned inside the range, in NIM. */
export function rewardsInRange(
  daily: { date: string; rewards: number }[],
  range: PortfolioRange
): number {
  return withinRange(daily, range).reduce((sum, day) => sum + day.rewards, 0);
}

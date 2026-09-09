import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { PORTFOLIO_RANGES } from './portfolio-range';

import type { PortfolioRange } from './portfolio-range';

// ----------------------------------------------------------------------

type Props = {
  value: PortfolioRange;
  onChange: (range: PortfolioRange) => void;
};

/**
 * The window every dated figure on the page is read against.
 *
 * Rendered on both charts rather than once at the top: the control belongs
 * beside the thing it changes, and whichever chart someone is reading is the
 * one they will reach for. They share a single piece of state in the view, so
 * they cannot drift -- and the stat cards name the range in their titles, which
 * is what makes the two copies read as one control rather than two.
 */
export function PortfolioRangeToggle({ value, onChange }: Props) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, next) => {
        // null when the active button is clicked again -- keep the range.
        if (next) {
          onChange(next as PortfolioRange);
        }
      }}
      sx={{ border: 0, flexWrap: 'wrap' }}
    >
      {PORTFOLIO_RANGES.map((option) => (
        <ToggleButton
          key={option}
          value={option}
          sx={{ border: 0, borderRadius: 1, px: 1.25, typography: 'caption', fontWeight: 600 }}
        >
          {option}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

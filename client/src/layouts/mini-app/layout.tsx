import { useNavigate } from 'react-router';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { useTheme } from '@mui/material/styles';
import GlobalStyles from '@mui/material/GlobalStyles';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';

import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';

import { useAuthContext } from 'src/auth/hooks';

import { NavMobile } from '../dashboard/nav-mobile';
import { layoutSectionVars } from '../core/css-vars';
import { SignInButton } from '../components/sign-in-button';
import { AccountDrawer } from '../components/account-drawer';
import { dashboardNavColorVars } from '../dashboard/css-vars';
import { navData as dashboardNavData } from '../nav-config-dashboard';

// ----------------------------------------------------------------------

/**
 * The three destinations worth a permanent tab.
 *
 * Reef is deliberately absent. It is a different origin and its own Mini App,
 * so a tab pointing at it would navigate out of this one rather than switch
 * screens inside it -- the one thing a bottom bar promises not to do.
 */
const TABS = [
  { label: 'Portfolio', path: paths.portfolio, icon: 'solar:wallet-linear' },
  { label: 'Network', path: paths.network, icon: 'solar:chart-2-linear' },
  { label: 'Staking', path: paths.staking, icon: 'solar:safe-square-linear' },
];

const NAV_HEIGHT = 64;

type Props = {
  children: React.ReactNode;
};

/**
 * The shell used inside Nimiq Pay.
 *
 * The dashboard layout this replaces is an admin template: a permanent sidebar
 * over seven sections, a desktop header, and navigation that reads as a website
 * because it is one. None of that belongs on a phone screen inside a wallet.
 *
 * So: no sidebar, no header, three tabs along the bottom, and everything else
 * behind More -- which opens the same NavMobile drawer the website already had,
 * so nothing in the tree becomes unreachable. Sign-in lives in that drawer too,
 * since there is no header left to put it in.
 *
 * Pages are untouched. They still render <DashboardContent>, which reads its
 * padding from CSS variables, so this supplies its own values rather than
 * asking every page to know which shell it is in.
 */
export function MiniAppLayout({ children }: Props) {
  const theme = useTheme();
  const pathname = usePathname();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  // NavMobile takes its width and background from variables that LayoutSection
  // injects onto <body>. This shell renders no LayoutSection, so without these
  // the More drawer came out 75px wide and transparent -- measured in a real
  // browser against the website shell's 288px, solid drawer at the same
  // viewport. Onto <body> rather than this component's root, because the
  // drawer is portaled there and would never see a variable set on it.
  const settings = useSettingsContext();
  const navVars = dashboardNavColorVars(theme, settings.state.navColor, settings.state.navLayout);

  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  // -1 when the current page is not one of the tabs, which leaves all three
  // unselected rather than lighting up the wrong one.
  const selected = TABS.findIndex((tab) => pathname.startsWith(tab.path));

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        // The status bar and notch sit here in a WebView, so the first heading
        // must not start at the physical top edge.
        pt: 'env(safe-area-inset-top)',
        // What DashboardContent reads. The bottom value clears the fixed bar
        // and the home indicator beneath it, so the last card is reachable.
        '--layout-dashboard-content-pt': theme.spacing(2),
        '--layout-dashboard-content-px': theme.spacing(2),
        '--layout-dashboard-content-pb': `calc(${theme.spacing(3)} + ${NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
      }}
    >
      {/* The same set LayoutSection puts on <body>. Renders no element of its
          own -- it only inserts styles -- so it can sit anywhere in the tree. */}
      <GlobalStyles styles={{ body: { ...layoutSectionVars(theme), ...navVars.layout } }} />

      <Box component="main" sx={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>

      {/* Everything that is not a tab. Reusing the website's own drawer rather
          than inventing a second menu keeps the two shells from drifting. */}
      <NavMobile
        data={dashboardNavData}
        open={open}
        onClose={onClose}
        slots={{
          bottomArea: (
            <Box sx={{ p: 2.5 }}>{user ? <AccountDrawer user={user} /> : <SignInButton />}</Box>
          ),
        }}
      />

      <Paper
        elevation={0}
        sx={{
          left: 0,
          right: 0,
          bottom: 0,
          position: 'fixed',
          borderRadius: 0,
          zIndex: theme.zIndex.appBar,
          borderTop: `solid 1px ${theme.vars.palette.divider}`,
          bgcolor: 'background.paper',
          pb: 'env(safe-area-inset-bottom)',
        }}
      >
        <BottomNavigation showLabels value={selected} sx={{ height: NAV_HEIGHT, bgcolor: 'transparent' }}>
          {TABS.map((tab, index) => (
            <BottomNavigationAction
              key={tab.path}
              value={index}
              label={tab.label}
              icon={<Iconify width={24} icon={tab.icon} />}
              onClick={() => navigate(tab.path)}
            />
          ))}

          {/* value never matches `selected`, so opening More does not steal the
              highlight from the tab you are actually on. */}
          <BottomNavigationAction
            value="more"
            label="More"
            icon={<Iconify width={24} icon="solar:menu-dots-bold" />}
            onClick={onOpen}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}

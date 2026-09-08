import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />
);

export const ICONS = {
  job: icon('ic-job'),
  blog: icon('ic-blog'),
  chat: icon('ic-chat'),
  mail: icon('ic-mail'),
  user: icon('ic-user'),
  file: icon('ic-file'),
  lock: icon('ic-lock'),
  tour: icon('ic-tour'),
  order: icon('ic-order'),
  label: icon('ic-label'),
  blank: icon('ic-blank'),
  kanban: icon('ic-kanban'),
  folder: icon('ic-folder'),
  course: icon('ic-course'),
  banking: icon('ic-banking'),
  booking: icon('ic-booking'),
  invoice: icon('ic-invoice'),
  product: icon('ic-product'),
  calendar: icon('ic-calendar'),
  disabled: icon('ic-disabled'),
  external: icon('ic-external'),
  menuItem: icon('ic-menu-item'),
  ecommerce: icon('ic-ecommerce'),
  analytics: icon('ic-analytics'),
  dashboard: icon('ic-dashboard'),
  parameter: icon('ic-parameter'),
  explorer: icon('ic-explorer'),
  pools: icon('ic-pools'),
  reef: icon('ic-reef'),
};

// ----------------------------------------------------------------------

export const navData: NavSectionProps['data'] = [
  /**
   * Dashboard
   *
   * Alone at the top with no subheader: the domain root now serves this, so it
   * is the site's home rather than one tool among several. A subheader here
   * would file it under a category and undo that.
   */
  {
    items: [{ title: 'Dashboard', path: paths.nimiqDashboard, icon: ICONS.dashboard }],
  },
  /**
   * Pool
   */
  {
    subheader: 'Pool',
    items: [
      { title: 'Staking', path: paths.staking, icon: ICONS.invoice },
      { title: 'FAQ', path: paths.faq, icon: ICONS.label },
    ],
  },
  /**
   * Games
   *
   * Its own section rather than an entry under Tools: a tool is something you
   * use to answer a question about the chain, and this is not that. Named for
   * what it is, like the sections around it.
   */
  {
    subheader: 'Games',
    items: [
      // A different origin, like the Contact us links below.
      { title: 'Reef', path: 'https://reef.nimiq.cafe', icon: ICONS.reef },
    ],
  },
  /**
   * Tools
   *
   * Just the two calculators. They used to sit at the bottom of a seven-item
   * Tools list, under the explorer pages, where nothing suggested they were
   * self-contained things you open and use on their own.
   */
  {
    subheader: 'Tools',
    items: [
      { title: 'Calculator', path: paths.calculator, icon: ICONS.parameter },
      { title: 'Converter', path: paths.converter, icon: ICONS.banking },
    ],
  },
  /**
   * Explorer
   *
   * Split out of Tools. These four are all "browse the chain", and giving them
   * their own heading is what let Tools shrink to the two utilities above.
   */
  {
    subheader: 'Explorer',
    items: [
      { title: 'Explorer', path: paths.explorer, icon: ICONS.explorer },
      { title: 'Pools', path: paths.pools.root, icon: ICONS.pools },
      {
        title: 'Blocks',
        path: paths.blocks,
        icon: <Iconify width={25} icon='mdi-cube-outline' sx={{ mr: 1 }} />,
      },
      {
        title: 'Transactions',
        path: paths.transactions,
        icon: <Iconify width={25} icon='mdi-pound' sx={{ mr: 1 }} />,
      },
    ],
  },
  /**
   * Contact us
   */
  {
    subheader: 'Contact us',
    items: [
      { title: 'Telegram', path: 'https://t.me/+K76FZSRFP0hmZmYx', icon: ICONS.chat },
      { title: 'Discord', path: 'https://discord.gg/zzu2RwsjcD', icon: ICONS.chat },
    ],
  },
];

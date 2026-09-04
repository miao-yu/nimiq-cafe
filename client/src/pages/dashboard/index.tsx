import { CONFIG } from 'src/global-config';

import { PageMeta } from 'src/components/seo';

import { OverviewAppView } from 'src/sections/overview/app/view';

// ----------------------------------------------------------------------

const metadata = {
  title: `Staking - ${CONFIG.appName}`,
  description:
    'Stake NIM with NimiqCafe: rewards every 15 minutes, a 10 NIM payout threshold and fees from 2.25%, with live pool stats, staker tiers and payout history.',
};

export default function OverviewAppPage() {
  return (
    <>
      <PageMeta title={metadata.title} description={metadata.description} path="/staking" />

      <OverviewAppView />
    </>
  );
}

import { CONFIG } from 'src/global-config';

import { PageMeta } from 'src/components/seo';

import { PoolListView } from 'src/sections/pool/view';

// ----------------------------------------------------------------------

const metadata = {
  title: `Nimiq Staking Pools - ${CONFIG.appName}`,
  description:
    'Compare every Nimiq staking pool side by side: pool fee, payout type and schedule, validator score, total NIM staked and staker count. Pick the right validator.',
};

export default function Page() {
  return (
    <>
      <PageMeta title={metadata.title} description={metadata.description} path="/pools" />

      <PoolListView />
    </>
  );
}

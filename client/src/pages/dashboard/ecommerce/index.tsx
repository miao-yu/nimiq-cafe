import { CONFIG } from 'src/global-config';

import { PageMeta } from 'src/components/seo';

import { OverviewEcommerceView } from 'src/sections/overview/e-commerce/view';

// ----------------------------------------------------------------------

const metadata = {
  title: `Nimiq Dashboard - ${CONFIG.appName}`,
  description:
    'Live Nimiq network stats: NIM price, volume and market cap, daily transactions and TPS, elected validators, total staked, APY, inflation and supply growth.',
};

export default function Page() {
  return (
    <>
      <PageMeta title={metadata.title} description={metadata.description} path="/dashboard" />

      <OverviewEcommerceView />
    </>
  );
}

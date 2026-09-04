import { CONFIG } from 'src/global-config';

import { PageMeta } from 'src/components/seo';

import { FaqsView } from 'src/sections/faqs/view';

// ----------------------------------------------------------------------

const metadata = {
  title: `FAQ - ${CONFIG.appName}`,
  description:
    'Answers about staking with NimiqCafe: the 100 NIM minimum, pool fees, 15-minute payouts, how epoch rewards are calculated and what unstaking involves.',
};

export default function Page() {
  return (
    <>
      <PageMeta title={metadata.title} description={metadata.description} path="/faq" />

      <FaqsView />
    </>
  );
}

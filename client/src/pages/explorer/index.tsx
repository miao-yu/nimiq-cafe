import { CONFIG } from 'src/global-config';

import { PageMeta } from 'src/components/seo';

import { ExplorerView } from 'src/sections/explorer/home/view';

// ----------------------------------------------------------------------

const metadata = {
  title: `Explorer - ${CONFIG.appName}`,
  description:
    'Search the Nimiq blockchain by block number, transaction hash or address, and watch the newest blocks and NIM transfers stream in live as they are produced.',
};

export default function Page() {
  return (
    <>
      <PageMeta title={metadata.title} description={metadata.description} path="/explorer" />

      <ExplorerView />
    </>
  );
}

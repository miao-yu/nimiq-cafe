import { CONFIG } from 'src/global-config';

import { PageMeta } from 'src/components/seo';

import { BlocksView } from 'src/sections/explorer/blocks/view';

// ----------------------------------------------------------------------

const metadata = {
  title: `Blocks | Explorer - ${CONFIG.appName}`,
  description:
    'Follow Nimiq blocks in real time, each showing its block number, producing validator and transaction count, or look one up by block number or block hash.',
};

export default function Page() {
  return (
    <>
      <PageMeta title={metadata.title} description={metadata.description} path="/blocks" />

      <BlocksView />
    </>
  );
}

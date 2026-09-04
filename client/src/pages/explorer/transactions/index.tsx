import { CONFIG } from 'src/global-config';

import { PageMeta } from 'src/components/seo';

import { TransactionsView } from 'src/sections/explorer/transactions/view';

// ----------------------------------------------------------------------

const metadata = {
  title: `Transactions | Explorer - ${CONFIG.appName}`,
  description:
    'Watch Nimiq transactions confirm in real time, with the sender, recipient and NIM amount of every transfer, or find a specific one by transaction hash.',
};

export default function Page() {
  return (
    <>
      <PageMeta title={metadata.title} description={metadata.description} path="/transactions" />

      <TransactionsView />
    </>
  );
}

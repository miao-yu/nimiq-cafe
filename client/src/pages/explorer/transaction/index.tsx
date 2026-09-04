import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';
import { useGetTransaction } from 'src/actions/blockchain';

import { PageMeta } from 'src/components/seo';

import { TransactionView } from 'src/sections/explorer/transaction/view';

// ----------------------------------------------------------------------

export default function Page() {
  const { hash = '' } = useParams();

  const { transaction, transactionError, transactionLoading } = useGetTransaction(hash);

  const metadata = {
    title: `Transaction ${hash} | Explorer - ${CONFIG.appName}`,
    description: `Nimiq transaction ${hash}: sender and recipient, NIM amount, fee, block height and confirmation time.`,
  };

  return (
    <>
      <PageMeta
        title={metadata.title}
        description={metadata.description}
        path={`/tx/${hash}`}
        noIndex
      />

      <TransactionView
        transaction={transaction}
        error={transactionError}
        loading={transactionLoading}
      />
    </>
  );
}

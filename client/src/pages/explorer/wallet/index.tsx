import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';
import { useGetWallet } from 'src/actions/blockchain';

import { PageMeta } from 'src/components/seo';

import { WalletView } from 'src/sections/explorer/wallet/view';

// ----------------------------------------------------------------------

export default function Page() {
  const { address = '' } = useParams();

  const { wallet, walletError, walletLoading } = useGetWallet(address);

  const metadata = {
    title: `Wallet ${address} | Explorer - ${CONFIG.appName}`,
    description: `Nimiq address ${address}: total, staking, wallet and inactive balance, plus the transactions sent to and from this account.`,
  };

  return (
    <>
      <PageMeta
        title={metadata.title}
        description={metadata.description}
        path={`/wallet/${encodeURIComponent(address)}`}
        noIndex
      />

      <WalletView wallet={wallet} error={walletError} loading={walletLoading} />
    </>
  );
}

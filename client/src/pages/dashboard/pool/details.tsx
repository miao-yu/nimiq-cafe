import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';
import { useGetPool } from 'src/actions/blockchain';

import { PageMeta } from 'src/components/seo';

import { PoolDetailsView } from 'src/sections/pool/view';

// ----------------------------------------------------------------------

export default function Page() {
  const { address = '' } = useParams();

  const { pool, poolLoading, poolError } = useGetPool(address);

  const metadata = {
    title: `${address} | Nimiq Staking Pool - ${CONFIG.appName}`,
    description: `Nimiq staking pool ${address}: fee, payout type and schedule, validator score, total NIM staked, network share and the full list of stakers.`,
  };

  return (
    <>
      {/* Addresses contain spaces, so the segment has to be encoded or the
          canonical is not a legal URL -- and it has to match the encoded form
          the server injects into the shell, or the two disagree on hydration. */}
      <PageMeta
        title={metadata.title}
        description={metadata.description}
        path={`/pools/${encodeURIComponent(address)}`}
      />

      <PoolDetailsView pool={pool} error={poolError} loading={poolLoading} />
    </>
  );
}

import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';
import { useGetBlock } from 'src/actions/blockchain';

import { PageMeta } from 'src/components/seo';

import { BlockView } from 'src/sections/explorer/block/view';

// ----------------------------------------------------------------------

export default function Page() {
  const { blockNumber = '' } = useParams();

  const { block, blockError, blockLoading } = useGetBlock(blockNumber);

  const metadata = {
    title: `Block ${blockNumber} | Explorer - ${CONFIG.appName}`,
    description: `Block ${blockNumber} on the Nimiq blockchain: block hash, size, transaction count, NIM volume, timestamp and every transfer included in the block.`,
  };

  return (
    <>
      <PageMeta
        title={metadata.title}
        description={metadata.description}
        path={`/block/${blockNumber}`}
        noIndex
      />

      <BlockView block={block} error={blockError} loading={blockLoading} />
    </>
  );
}

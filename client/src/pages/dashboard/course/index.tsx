import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';
import { useGetPoolStaker } from 'src/actions/pool';

import { PageMeta } from 'src/components/seo';

import { OverviewCourseView } from 'src/sections/overview/course/view';

// ----------------------------------------------------------------------

export default function Page() {
  const { address = '' } = useParams();

  const { poolStaker, poolStakerError, poolStakerLoading } = useGetPoolStaker(address);

  const metadata = {
    title: `${address} - ${CONFIG.appName}`,
    description: `NimiqCafe staking dashboard for ${address}: lifetime and daily NIM rewards, loyalty tier, pool share and pending payout.`,
  };

  return (
    <>
      <PageMeta
        title={metadata.title}
        description={metadata.description}
        path={`/staker/${encodeURIComponent(address)}`}
        noIndex
      />

      <OverviewCourseView
        poolStaker={poolStaker}
        error={poolStakerError}
        loading={poolStakerLoading}
      />
    </>
  );
}

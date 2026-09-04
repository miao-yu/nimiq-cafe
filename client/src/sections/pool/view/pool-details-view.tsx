import type { IPoolItem } from 'src/types/pool';

import { useTabs } from 'minimal-shared/hooks';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components/router-link';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { PoolDetailsContent } from '../pool-details-content';
import { PoolDetailsStakers } from '../pool-details-stakers';
import { PoolDetailsToolbar } from '../pool-details-toolbar';

export const POOL_DETAILS_TABS = [
  { label: 'Pool Details', value: 'details' },
  { label: 'Stakers', value: 'stakers' },
];

// ----------------------------------------------------------------------

type Props = {
  pool?: IPoolItem;
  error: any;
  loading: boolean;
};

export function PoolDetailsView({ pool, error, loading }: Props) {
  const tabs = useTabs('details');

  if (loading || pool === undefined) {
    return (
      <DashboardContent maxWidth={false}>
        <EmptyContent
          filled
          title="Loading..."
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  if (error) {
    return (
      <DashboardContent maxWidth={false}>
        <EmptyContent
          filled
          title="Pool not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.pools.root}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to list
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  const renderToolbar = () => (
    <PoolDetailsToolbar
      backHref={paths.pools.root}
    />
  );

  const renderTabs = () => (
    <Tabs value={tabs.value} onChange={tabs.onChange} sx={{ mb: { xs: 3, md: 5 } }}>
      {POOL_DETAILS_TABS.map((tab) => (
        <Tab
          key={tab.value}
          iconPosition="end"
          value={tab.value}
          label={tab.label}
          icon={
            tab.value === 'stakers' ? (
              <Label variant="filled">{pool.numStakers}</Label>
            ) : (
              ''
            )
          }
        />
      ))}
    </Tabs>
  );

  return (
    <DashboardContent>
      {renderToolbar()}

      {renderTabs()}
      {tabs.value === 'details' && <PoolDetailsContent pool={pool} />}
      {tabs.value === 'stakers' && <PoolDetailsStakers stakers={pool.stakers ?? []} />}
    </DashboardContent>
  );
}

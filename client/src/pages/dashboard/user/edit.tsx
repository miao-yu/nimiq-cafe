import { CONFIG } from 'src/global-config';

import { PageMeta } from 'src/components/seo';

import { UserEditView } from 'src/sections/user/view';

// ----------------------------------------------------------------------

const metadata = {
  title: `Settings - ${CONFIG.appName}`,
  description:
    'Manage your NimiqCafe account settings and the email alerts you receive about your Nimiq staking rewards and payouts.',
};

export default function Page() {
  return (
    <>
      <PageMeta
        title={metadata.title}
        description={metadata.description}
        path="/settings"
        noIndex
      />

      <UserEditView />
    </>
  );
}

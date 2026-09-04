import { CONFIG } from 'src/global-config';

import { PageMeta } from 'src/components/seo';

import { NimiqSignInView } from 'src/auth/view/nimiq';

// ----------------------------------------------------------------------

const metadata = {
  title: `Sign in | Nimiq - ${CONFIG.appName}`,
  description:
    'Sign in to NimiqCafe with your Nimiq address to track your staking rewards, payouts and pool tier.',
};

export default function Page() {
  return (
    <>
      <PageMeta
        title={metadata.title}
        description={metadata.description}
        path="/auth/nimiq/sign-in"
        noIndex
      />

      <NimiqSignInView />
    </>
  );
}

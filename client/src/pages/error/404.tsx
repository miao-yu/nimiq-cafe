import { CONFIG } from 'src/global-config';

import { PageMeta } from 'src/components/seo';

import { NotFoundView } from 'src/sections/error';

// ----------------------------------------------------------------------

const metadata = {
  title: `404 page not found! | Error - ${CONFIG.appName}`,
  description:
    'This NimiqCafe page does not exist. Head back to the Nimiq staking pool, explorer or tools.',
};

export default function Page() {
  return (
    <>
      <PageMeta title={metadata.title} description={metadata.description} path="/error/404" noIndex />

      <NotFoundView />
    </>
  );
}

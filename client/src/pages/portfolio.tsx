import { CONFIG } from 'src/global-config';

import { PageMeta } from 'src/components/seo';

import { PortfolioView } from 'src/sections/portfolio/view';

// ----------------------------------------------------------------------

const metadata = {
  title: `Portfolio - ${CONFIG.appName}`,
  description:
    'Your Nimiq holdings in one place: balance, stake, rewards and value over time across every address you have signed in with.',
};

export default function Page() {
  return (
    <>
      {/* Signed-in only, so it must never be indexed -- metaFor() in
          server/seo.js already answers unknown paths with noindex. */}
      <PageMeta title={metadata.title} description={metadata.description} path="/portfolio" />

      <PortfolioView />
    </>
  );
}

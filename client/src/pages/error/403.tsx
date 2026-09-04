import { CONFIG } from 'src/global-config';

import { PageMeta } from 'src/components/seo';

import { View403 } from 'src/sections/error';

// ----------------------------------------------------------------------

const metadata = {
  title: `403 forbidden! | Error - ${CONFIG.appName}`,
  description: 'You do not have permission to view this NimiqCafe page.',
};

export default function Page() {
  return (
    <>
      <PageMeta title={metadata.title} description={metadata.description} path="/error/403" noIndex />

      <View403 />
    </>
  );
}

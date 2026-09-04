import { CONFIG } from 'src/global-config';

import { PageMeta } from 'src/components/seo';

import { View500 } from 'src/sections/error';

// ----------------------------------------------------------------------

const metadata = {
  title: `500 Internal server error! | Error - ${CONFIG.appName}`,
  description: 'Something went wrong on NimiqCafe. Please try again in a moment.',
};

export default function Page() {
  return (
    <>
      <PageMeta title={metadata.title} description={metadata.description} path="/error/500" noIndex />

      <View500 />
    </>
  );
}

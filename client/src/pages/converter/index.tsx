import { CONFIG } from 'src/global-config';

import { PageMeta } from 'src/components/seo';

import { ConverterView } from 'src/sections/converter/view';

// ----------------------------------------------------------------------

const metadata = {
  title: `NIM Converter - ${CONFIG.appName}`,
  description:
    'Convert NIM to USD, EUR, BTC and other currencies at the latest reference rate. Type in either field to flip direction and see when the price last updated.',
};

export default function Page() {
  return (
    <>
      <PageMeta title={metadata.title} description={metadata.description} path="/converter" />

      <ConverterView />
    </>
  );
}

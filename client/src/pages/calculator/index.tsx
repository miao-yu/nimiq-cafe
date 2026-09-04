import { CONFIG } from 'src/global-config';

import { PageMeta } from 'src/components/seo';

import { CalculatorView } from 'src/sections/calculator/view';

// ----------------------------------------------------------------------

const metadata = {
  title: `Nimiq Staking Calculator - ${CONFIG.appName}`,
  description:
    'Estimate your Nimiq staking income. Set a NIM amount, price, pool fee and restaking to see daily, weekly, monthly and yearly rewards in your currency.',
};

export default function Page() {
  return (
    <>
      <PageMeta title={metadata.title} description={metadata.description} path="/calculator" />

      <CalculatorView />
    </>
  );
}

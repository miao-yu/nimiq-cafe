import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

const SITE_URL = 'https://nimiq.cafe';

const DEFAULT_IMAGE = '/logo/og-default.png';

export type PageMetaProps = {
  /** Document title, also used for `og:title` and `twitter:title`. */
  title: string;
  /** Meta description, also used for `og:description` and `twitter:description`. */
  description: string;
  /** Canonical path, e.g. `/calculator`. */
  path: string;
  /** Social share image, absolute URL or root-relative path. */
  image?: string;
  /** Keep the page out of search results, but still follow its links. */
  noIndex?: boolean;
};

export function PageMeta({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  noIndex,
}: PageMetaProps) {
  const url = `${SITE_URL}${path}`;

  const imageUrl = image.startsWith('/') ? `${SITE_URL}${image}` : image;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={CONFIG.appName} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={imageUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {noIndex && <meta name="robots" content="noindex, follow" />}
    </Helmet>
  );
}

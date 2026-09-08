// Search-engine plumbing for the SPA: robots.txt, sitemap.xml, and the head
// tags that get injected into index.html before it is served.
//
// Why inject server-side at all when the client already sets titles with
// react-helmet-async: the built index.html is a 646-byte shell, so a crawler
// that does not run JavaScript -- Bing, Telegram, Discord, X, most AI crawlers
// -- sees no title, no description and no preview image. Everything here lands
// in the raw HTML, so it works before a single byte of the bundle executes.
//
// The tags carry data-rh="true", which is react-helmet-async's ownership
// marker. Without it Helmet appends its own copies on hydration and the page
// ends up with two of every meta tag; with it, Helmet adopts and replaces them.
// The JSON-LD blocks deliberately omit the marker so they survive hydration --
// nothing on the client emits them.

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://nimiq.cafe';
const SITE_NAME = 'NimiqCafe';
const DEFAULT_IMAGE = `${SITE_URL}/logo/og-default.png`;

const POOLS_FILE = path.join(__dirname, 'json/pools.json');
const FAQS_FILE = path.join(__dirname, 'json/faqs.json');

// Routes worth indexing. Everything absent from this map either has no unique
// content or belongs to an unbounded URL space (58M blocks, every transaction,
// every wallet) that would eat the crawl budget before Google reached a page
// that matters. Those are excluded in robots.txt and marked noindex client-side.
const ROUTES = {
    '/staking': {
        title: `Nimiq Staking Pool - ${SITE_NAME}`,
        description:
            'Stake NIM with NimiqCafe: low fees, payouts every minute and a 10 NIM minimum. Track pool performance, rewards and validator status in real time.',
        changefreq: 'hourly',
        priority: '0.9',
        breadcrumb: ['Pool', 'Staking'],
    },
    '/pools': {
        title: `Nimiq Staking Pools - ${SITE_NAME}`,
        description:
            'Compare every Nimiq staking pool side by side: fees, payout schedule, payout type, total stake, staker count and validator score. Updated continuously.',
        changefreq: 'hourly',
        priority: '0.8',
        breadcrumb: ['Explorer', 'Pools'],
    },
    '/network': {
        title: `Nimiq Network Stats - ${SITE_NAME}`,
        description:
            'Live Nimiq network stats: NIM price, volume and market cap, daily transactions and TPS, elected validators, total staked, APY, inflation and supply growth.',
        changefreq: 'hourly',
        priority: '1.0',
    },
    '/calculator': {
        title: `Nimiq Staking Calculator - ${SITE_NAME}`,
        description:
            'Work out what your NIM will earn. Enter a stake amount and pool fee to project Nimiq staking rewards daily, monthly and yearly, in NIM and in fiat.',
        changefreq: 'daily',
        priority: '0.8',
        breadcrumb: ['Tools', 'Calculator'],
    },
    '/converter': {
        title: `NIM Converter - ${SITE_NAME}`,
        description:
            'Convert NIM to USD, EUR and other currencies at the live Nimiq exchange rate, and back again. Fast, free and no account needed.',
        changefreq: 'daily',
        priority: '0.7',
        breadcrumb: ['Tools', 'Converter'],
    },
    '/explorer': {
        title: `Explorer - ${SITE_NAME}`,
        description:
            'Search the Nimiq blockchain by block, transaction hash or wallet address, and follow new blocks and transfers as they are confirmed.',
        changefreq: 'hourly',
        priority: '0.7',
        breadcrumb: ['Explorer'],
    },
    '/blocks': {
        title: `Blocks | Explorer - ${SITE_NAME}`,
        description:
            'Browse the latest Nimiq blocks with producer, transaction count, size and timestamp, and open any block to see everything it contains.',
        changefreq: 'always',
        priority: '0.6',
        breadcrumb: ['Explorer', 'Blocks'],
    },
    '/transactions': {
        title: `Transactions | Explorer - ${SITE_NAME}`,
        description:
            'Follow Nimiq transactions in real time: sender, recipient, amount and fee for every transfer confirmed on the network.',
        changefreq: 'always',
        priority: '0.6',
        breadcrumb: ['Explorer', 'Transactions'],
    },
    '/faq': {
        title: `FAQ - ${SITE_NAME}`,
        description:
            'Answers to the common Nimiq staking questions: how to start, minimum stake, fees, how often rewards are paid, and whether your NIM stays under your control.',
        changefreq: 'weekly',
        priority: '0.7',
        breadcrumb: ['Pool', 'FAQ'],
    },
};

// Prefixes a crawler should never follow. Each one is either unbounded or
// account-specific, and none of them has content anyone searches for.
const DISALLOWED = ['/block/', '/tx/', '/wallet/', '/staker/', '/settings', '/auth/', '/error/'];

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// JSON-LD sits inside a <script> block, where the only sequence that can break
// out is a literal </script>. Escaping the slash keeps it valid JSON.
function escapeJsonLd(value) {
    return JSON.stringify(value).replace(/<\/script/gi, '<\\/script');
}

function readJson(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
        // Written by cron (storePools.js); missing or half-written is survivable
        // -- the page still renders, it just loses the richer markup.
        return fallback;
    }
}

// Addresses contain spaces, so the path segment has to be encoded to be a legal
// URL. encodeURIComponent would also escape the slash separators, hence the
// per-segment call.
function poolPath(address) {
    return `/pools/${encodeURIComponent(address)}`;
}

function robotsTxt() {
    return [
        '# https://nimiq.cafe',
        'User-agent: *',
        ...DISALLOWED.map((prefix) => `Disallow: ${prefix}`),
        '',
        '# Explorer detail pages are generated per block, transaction and wallet.',
        '# They are excluded above so the crawl budget goes to the pages that rank.',
        '',
        `Sitemap: ${SITE_URL}/sitemap.xml`,
        '',
    ].join('\n');
}

function buildSitemap() {
    const pools = readJson(POOLS_FILE, []);
    const lastmod = new Date().toISOString().slice(0, 10);

    const urls = Object.keys(ROUTES).map((route) => ({
        loc: SITE_URL + route,
        changefreq: ROUTES[route].changefreq,
        priority: ROUTES[route].priority,
    }));

    pools
        .filter((pool) => pool && pool.address)
        .forEach((pool) => {
            urls.push({
                loc: SITE_URL + poolPath(pool.address),
                changefreq: 'daily',
                priority: '0.6',
            });
        });

    const body = urls
        .map(
            (url) =>
                `  <url>\n    <loc>${escapeHtml(url.loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n` +
                `    <changefreq>${url.changefreq}</changefreq>\n    <priority>${url.priority}</priority>\n  </url>`
        )
        .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

// ----------------------------------------------------------------------
// Structured data
// ----------------------------------------------------------------------

function organizationLd() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/logo/logo-single.svg`,
        description:
            'Nimiq staking pool, blockchain explorer and tools for the Nimiq (NIM) ecosystem.',
        sameAs: ['https://x.com/nimiqcafe', 'https://t.me/nimiqcafe'],
    };
}

// WebSite is still supported for the site-name treatment in search results,
// which is why NimiqCafe rather than nimiq.cafe shows above the URL. It used to
// also drive the sitelinks search box; Google retired that in November 2024, so
// there is deliberately no SearchAction here.
function webSiteLd() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        alternateName: 'Nimiq Cafe',
        url: SITE_URL,
    };
}

function breadcrumbLd(trail, pathname) {
    const items = [{ name: 'Home', item: `${SITE_URL}/network` }];

    trail.forEach((name, index) => {
        // Only the final crumb is a real destination; the intermediate ones are
        // nav groupings, so they point at the page itself rather than inventing
        // URLs that would 404.
        items.push({
            name,
            item: index === trail.length - 1 ? SITE_URL + pathname : undefined,
        });
    });

    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((entry, index) => {
            const element = { '@type': 'ListItem', position: index + 1, name: entry.name };
            if (entry.item) {
                element.item = entry.item;
            }
            return element;
        }),
    };
}

// The pool comparison is the one genuinely unique dataset on the site, and
// Dataset is still a supported rich-result type. It also gets the page into
// Google Dataset Search, where no other Nimiq site currently appears.
function poolsDatasetLd() {
    const pools = readJson(POOLS_FILE, []);

    return {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: 'Nimiq staking pool comparison',
        description:
            'Fees, payout type, payout schedule, total stake, staker count and validator score for every active Nimiq (NIM) staking pool, refreshed continuously from the Nimiq blockchain.',
        url: `${SITE_URL}/pools`,
        keywords: ['Nimiq', 'NIM', 'staking pool', 'validator', 'proof of stake', 'cryptocurrency'],
        license: 'https://creativecommons.org/licenses/by/4.0/',
        isAccessibleForFree: true,
        creator: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        variableMeasured: [
            'pool fee',
            'payout type',
            'payout schedule',
            'total stake',
            'staker count',
            'validator score',
        ],
        distribution: [
            {
                '@type': 'DataDownload',
                encodingFormat: 'application/json',
                contentUrl: `${SITE_URL}/api/pools`,
            },
        ],
        ...(pools.length ? { size: `${pools.length} staking pools` } : {}),
    };
}

// Kept in server/json/faqs.json rather than read out of the React component,
// because the component holds it as JSX-escaped literals. The two must be
// edited together -- see the note at the top of that file.
function faqLd() {
    const faqs = readJson(FAQS_FILE, []);

    if (!faqs.length) {
        return null;
    }

    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.heading,
            acceptedAnswer: { '@type': 'Answer', text: faq.detail },
        })),
    };
}

function poolLd(pool) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FinancialProduct',
        name: `${pool.name} - Nimiq staking pool`,
        description: pool.description || `Nimiq (NIM) staking pool ${pool.name}.`,
        url: SITE_URL + poolPath(pool.address),
        provider: { '@type': 'Organization', name: pool.name, ...(pool.website ? { url: pool.website } : {}) },
        feesAndCommissionsSpecification: `${(Number(pool.fee) * 100).toFixed(2)}% of staking rewards`,
    };
}

// ----------------------------------------------------------------------
// Head-tag rendering
// ----------------------------------------------------------------------

function findPool(pathname) {
    const match = pathname.match(/^\/pools\/(.+)$/);

    if (!match) {
        return null;
    }

    let address;
    try {
        address = decodeURIComponent(match[1]);
    } catch {
        // A malformed percent-escape is not worth a 500; fall through to the
        // generic pools metadata.
        return null;
    }

    return readJson(POOLS_FILE, []).find((pool) => pool.address === address) || null;
}

function metaFor(pathname) {
    if (ROUTES[pathname]) {
        return { ...ROUTES[pathname], path: pathname, index: true };
    }

    // The root redirects to /network client-side, but a crawler sees whatever
    // the server hands it first. Without this the most-linked URL on the domain
    // would fall through to the noindex default below.
    if (pathname === '/' || pathname === '') {
        return { ...ROUTES['/network'], path: '/network', index: true };
    }

    // Signed-in only, so it must never be indexed and must never enter the
    // sitemap -- which is why it is here rather than in ROUTES. It still gets
    // a real title and description: the shell is what fills the browser tab
    // before React runs, and what a link preview shows when someone pastes the
    // URL to themselves.
    if (pathname === '/portfolio') {
        return {
            title: `Portfolio - ${SITE_NAME}`,
            description:
                'Your Nimiq holdings in one place: balance, stake, rewards and value over time across every address you have signed in with.',
            path: '/portfolio',
            index: false,
        };
    }

    // /pools/list renders the same component as /pools, so it points its
    // canonical at /pools rather than competing with it.
    if (pathname === '/pools/list') {
        return { ...ROUTES['/pools'], path: '/pools', index: true };
    }

    const pool = findPool(pathname);

    if (pool) {
        // Both halves are optional in pools.json, and a description reading
        // "Foo: , payouts ." would be worse than simply leaving them out.
        const facts = [
            Number.isFinite(Number(pool.fee)) ? `${(Number(pool.fee) * 100).toFixed(2)}% fee` : null,
            pool.payoutSchedule ? `payouts ${String(pool.payoutSchedule).toLowerCase()}` : null,
        ].filter(Boolean);

        return {
            title: `${pool.name} | Nimiq Staking Pool - ${SITE_NAME}`,
            description: `${pool.name}${facts.length ? `: ${facts.join(', ')}` : ''}. Compare stake, stakers, validator score and rewards against every other Nimiq staking pool.`,
            path: poolPath(pool.address),
            breadcrumb: ['Tools', 'Pools', pool.name],
            pool,
            index: true,
        };
    }

    // Everything else -- explorer detail pages, settings, auth, unknown paths.
    // robots.txt already keeps crawlers out; the noindex is the belt to that
    // braces, for anything that reaches the URL another way.
    return {
        title: SITE_NAME,
        description:
            'NimiqCafe: Nimiq staking pool, blockchain explorer, staking calculator and NIM converter.',
        path: pathname,
        index: false,
    };
}

function structuredDataFor(meta) {
    const blocks = [organizationLd(), webSiteLd()];

    if (meta.breadcrumb) {
        blocks.push(breadcrumbLd(meta.breadcrumb, meta.path));
    }

    if (meta.path === '/pools') {
        blocks.push(poolsDatasetLd());
    }

    if (meta.path === '/faq') {
        const faq = faqLd();
        if (faq) {
            blocks.push(faq);
        }
    }

    if (meta.pool) {
        blocks.push(poolLd(meta.pool));
    }

    return blocks;
}

function headTags(meta) {
    const url = SITE_URL + meta.path;
    const tag = (attrs) => `    <meta ${attrs} data-rh="true" />`;

    const tags = [
        `    <meta name="description" content="${escapeHtml(meta.description)}" data-rh="true" />`,
        `    <link rel="canonical" href="${escapeHtml(url)}" data-rh="true" />`,
        tag('property="og:type" content="website"'),
        tag(`property="og:site_name" content="${SITE_NAME}"`),
        tag(`property="og:title" content="${escapeHtml(meta.title)}"`),
        tag(`property="og:description" content="${escapeHtml(meta.description)}"`),
        tag(`property="og:url" content="${escapeHtml(url)}"`),
        tag(`property="og:image" content="${DEFAULT_IMAGE}"`),
        tag('name="twitter:card" content="summary_large_image"'),
        tag(`name="twitter:title" content="${escapeHtml(meta.title)}"`),
        tag(`name="twitter:description" content="${escapeHtml(meta.description)}"`),
        tag(`name="twitter:image" content="${DEFAULT_IMAGE}"`),
    ];

    if (!meta.index) {
        tags.push(tag('name="robots" content="noindex, follow"'));
    }

    structuredDataFor(meta).forEach((block) => {
        tags.push(`    <script type="application/ld+json">${escapeJsonLd(block)}</script>`);
    });

    return tags.join('\n');
}

// Rewrites the shell's placeholder <title> instead of appending a second one --
// a document with two titles is legal HTML and browsers take the first, which
// would mean every page reporting itself as "NimiqCafe".
function renderShell(html, pathname) {
    const meta = metaFor(pathname);

    return html
        .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`)
        .replace('</head>', `${headTags(meta)}\n  </head>`);
}

module.exports = { ROUTES, DISALLOWED, robotsTxt, buildSitemap, renderShell, metaFor, SITE_URL };

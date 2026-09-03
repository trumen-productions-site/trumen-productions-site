/**
 * The document shell: <head>, header, footer, and the structured data every
 * page carries. Pages supply a `meta` object and a body string; everything
 * else is assembled here so no page can forget a canonical URL or a skip link.
 */

import { site } from '../site.config.mjs';
import { esc, each, when, mailto, clip } from './html.mjs';
import { wordmark, star, btn } from './components.mjs';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,700&display=swap';

/** Absolute URL for a site-root path. */
export function absolute(path) {
  return `${site.url.replace(/\/$/, '')}${path}`;
}

/* ─────────────────────────────────────────────────────────────────────────
   Structured data
   ───────────────────────────────────────────────────────────────────────── */

function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${absolute('/')}#organization`,
    name: site.namePlain,
    alternateName: [site.name, site.legalEntity],
    legalName: site.legalEntity,
    url: absolute('/'),
    slogan: site.tagline,
    description: site.description,
    email: site.contact.general,
    foundingDate: site.founded,
    founder: [
      { '@type': 'Person', name: 'Michael Anthony Martin' },
      { '@type': 'Person', name: 'David Alexander Martin' },
    ],
    ...(site.social.length ? { sameAs: site.social.map((s) => s.href) } : {}),
  };
}

function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${absolute('/')}#website`,
    url: absolute('/'),
    name: site.namePlain,
    publisher: { '@id': `${absolute('/')}#organization` },
    inLanguage: site.lang,
  };
}

function breadcrumbLd(path, title) {
  if (path === '/') return null;
  const parts = path.split('/').filter(Boolean);
  const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: absolute('/') }];
  let acc = '';
  parts.forEach((p, i) => {
    acc += `/${p}`;
    items.push({
      '@type': 'ListItem',
      position: i + 2,
      name: i === parts.length - 1 ? title : p.replace(/-/g, ' '),
      item: absolute(`${acc}/`),
    });
  });
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

/* ─────────────────────────────────────────────────────────────────────────
   Head
   ───────────────────────────────────────────────────────────────────────── */

function head({ title, description, path, ogType = 'website', jsonLd = [], css = [], preload = [], noindex = false }) {
  const fullTitle = path === '/' ? `${site.namePlain} — ${site.motto}` : `${title} · ${site.namePlain}`;
  const desc = clip(description || site.description, 300);
  const canonical = absolute(path);
  const ld = [organizationLd(), websiteLd(), breadcrumbLd(path, title), ...jsonLd].filter(Boolean);

  return `
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
${when(noindex, '<meta name="robots" content="noindex, follow">')}
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#201e1d">

<meta property="og:type" content="${esc(ogType)}">
<meta property="og:site_name" content="${esc(site.namePlain)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:locale" content="${esc(site.locale)}">
<meta property="og:image" content="${esc(absolute('/assets/img/og-default.png'))}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="TRU★MEN Productions — Viri Veri">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(absolute('/assets/img/og-default.png'))}">

<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${esc(FONT_HREF)}">
${each(preload, (p) => `<link rel="preload" href="${esc(p.href)}" as="${esc(p.as)}"${p.crossorigin ? ' crossorigin' : ''}>`)}
<link rel="stylesheet" href="/assets/css/site.css">
${each(css, (href) => `<link rel="stylesheet" href="${esc(href)}">`)}
${each(ld, (obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`)}
`.trim();
}

/* ─────────────────────────────────────────────────────────────────────────
   Header
   ───────────────────────────────────────────────────────────────────────── */

function header(path) {
  const isCurrent = (href) => path === href || (href !== '/' && path.startsWith(href));
  return `
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header" data-site-header>
  <div class="site-header__inner container">
    <a class="site-header__brand" href="/" ${path === '/' ? 'aria-current="page"' : ''}>
      ${wordmark({ size: 'sm', productions: true })}
      <span class="visually-hidden">${esc(site.namePlain)} — home</span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-nav-toggle>
      <span class="nav-toggle__bars" aria-hidden="true"><span></span><span></span></span>
      <span class="nav-toggle__label">Menu</span>
    </button>
    <nav class="site-nav" id="site-nav" aria-label="Primary">
      <ul class="site-nav__list">
        ${each(
          site.nav,
          (item) => `
        <li><a href="${esc(item.href)}"${isCurrent(item.href) ? ' aria-current="page"' : ''}>${esc(item.label)}</a></li>`,
        )}
      </ul>
    </nav>
  </div>
</header>`.trim();
}

/* ─────────────────────────────────────────────────────────────────────────
   Newsletter + footer
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The "stay close to the work" block.
 *
 * There is no form service behind this. The button composes a message in the
 * visitor's own mail client, so an address never touches a third party — which
 * is exactly what the copy promises.
 */
export function newsletter() {
  const href = mailto(
    site.contact.general,
    site.subjects.newsletter,
    'Please add me to the TRU★MEN Productions updates list.\n\nName:\n',
  );
  return `
<section class="newsletter" aria-labelledby="newsletter-title">
  <div class="container newsletter__inner">
    <div class="newsletter__copy">
      <p class="eyebrow">Connect with us</p>
      <h2 class="newsletter__title" id="newsletter-title">Stay close to the work</h2>
      <p class="newsletter__body">
        Occasional updates on the memoir, the screenplay, the series, and the documentary —
        sent only when there is something worth saying.
      </p>
    </div>
    <div class="newsletter__action">
      ${btn({ href, label: 'Subscribe by email', variant: 'primary' })}
      <p class="newsletter__note">
        Opens your own mail client. Your address goes to our inbox, nowhere else — no form
        service, no tracker. Unsubscribe by replying “stop.”
      </p>
    </div>
  </div>
</section>`.trim();
}

function footer() {
  const year = new Date().getFullYear();
  return `
<footer class="site-footer">
  <div class="container">
    <div class="site-footer__top">
      <div class="site-footer__brand">
        ${wordmark({ size: 'md', productions: true, motto: true })}
        <p class="site-footer__tagline">${esc(site.tagline)}</p>
        ${when(
          site.contact.phone,
          `<p class="site-footer__contact"><a href="tel:${esc(String(site.contact.phone).replace(/[^+\d]/g, ''))}">${esc(site.contact.phone)}</a></p>`,
        )}
        <p class="site-footer__contact"><a href="${esc(mailto(site.contact.general, site.subjects.general))}">${esc(site.contact.general)}</a></p>
        ${when(
          site.social.length,
          `<ul class="site-footer__social">${each(
            site.social,
            (s) => `<li><a href="${esc(s.href)}" rel="me noopener" target="_blank">${esc(s.label)}</a></li>`,
          )}</ul>`,
        )}
      </div>
      <nav class="site-footer__nav" aria-label="Footer">
        ${each(
          site.footerNav,
          (col) => `
        <div class="site-footer__col">
          <h2 class="site-footer__heading">${esc(col.heading)}</h2>
          <ul>
            ${each(col.links, (l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`)}
          </ul>
        </div>`,
        )}
      </nav>
    </div>
    <div class="site-footer__legal">
      <p>© ${year} ${esc(site.legalLine)}</p>
      <p class="site-footer__motto">${star({ size: 12, fill: '#ec3013' })} <em>${esc(site.motto)}</em> — ${esc(site.mottoTranslation)}</p>
    </div>
  </div>
</footer>`.trim();
}

/* ─────────────────────────────────────────────────────────────────────────
   The page
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Wrap a page body in the full document.
 *
 * @param {object} page
 * @param {string} page.path        site-root path, e.g. '/our-story/'
 * @param {string} page.title       page title (without the site suffix)
 * @param {string} page.description meta description
 * @param {string} page.body        the page's <main> contents
 * @param {string[]} [page.css]     extra stylesheets
 * @param {string[]} [page.js]      extra scripts, loaded as modules, deferred
 * @param {object[]} [page.jsonLd]  extra structured-data objects
 * @param {boolean} [page.chrome]   set false to omit header/footer (the player)
 */
export function render(page) {
  const {
    path,
    title,
    description,
    body,
    css = [],
    js = [],
    jsonLd = [],
    ogType,
    bodyClass = '',
    chrome = true,
    preload = [],
    noindex = false,
  } = page;

  return `<!doctype html>
<html lang="${esc(site.lang)}">
<head>
${head({ title, description, path, ogType, jsonLd, css, preload, noindex })}
</head>
<body class="${esc(bodyClass)}">
${chrome ? header(path) : ''}
<main id="main" class="site-main">
${body}
</main>
${chrome ? `${newsletter()}\n${footer()}` : ''}
<script src="/assets/js/site.js" defer></script>
${each(js, (src) => `<script src="${esc(src)}" defer></script>`)}
</body>
</html>
`;
}

export default render;

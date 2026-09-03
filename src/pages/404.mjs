import { btn } from '../lib/components.mjs';

const body = () => `
<section class="error-page">
  <div class="container">
    <p class="error-page__code">404</p>
    <h1 style="font-size:var(--step-3);max-width:24ch;margin-inline:auto">
      This page is not in the record.
    </h1>
    <p class="lede" style="max-width:44ch">
      The address you followed does not exist here. Everything we publish is one link away below.
    </p>
    <div class="btn-row">
      ${btn({ href: '/', label: 'Home', variant: 'primary' })}
      ${btn({ href: '/clearly-established/', label: 'Clearly Established', variant: 'secondary' })}
      ${btn({ href: '/projects/', label: 'Projects', variant: 'secondary' })}
      ${btn({ href: '/contact/', label: 'Contact', variant: 'secondary' })}
    </div>
  </div>
</section>
`;

export default {
  path: '/404.html',
  title: 'Page not found',
  description: 'The page you were looking for is not on this site.',
  noindex: true,
  sitemap: false,
  body,
};

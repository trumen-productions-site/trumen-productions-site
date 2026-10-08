import { values } from '../data/company.mjs';
import { esc, each } from '../lib/html.mjs';
import { btn, pageHeader, sectionHead } from '../lib/components.mjs';

const body = () => `
${pageHeader({
  eyebrow: 'Our core values influence everything we make',
  title: 'Four things we will not trade away',
  lede:
    'Behind every page and every frame is a set of beliefs that shaped it. Ours are written ' +
    'down so that the work — and the people who make it — can be measured against them.',
})}

<section class="section">
  <div class="container">
    ${each(
      values,
      (v) => `
    <article class="value" id="${esc(v.id)}" data-reveal>
      <div class="value__grid">
        <div>
          <h2 class="value__latin">${esc(v.latin)}</h2>
          <p class="value__english">${esc(v.english)}</p>
        </div>
        <div>
          <p class="value__summary">${esc(v.summary)}</p>
          <div class="prose">${each(v.body, (p) => `<p>${esc(p)}</p>`)}</div>
        </div>
      </div>
    </article>`,
    )}
  </div>
</section>

<section class="section section--dim">
  <div class="container" data-reveal>
    ${sectionHead({
      label: 'Hold us to it',
      title: 'If we get something wrong, tell us.',
      lede:
        'A company built on the record has to be correctable. If a date, a quotation, or a ' +
        'citation on this site is wrong, write to us and we will fix it and say that we did.',
    })}
    <div class="btn-row" style="margin-top:0">
      ${btn({ href: '/contact/', label: 'Contact us', variant: 'primary' })}
      ${btn({ href: '/faq/', label: 'Read the FAQ', variant: 'secondary' })}
    </div>
  </div>
</section>
`;

export default {
  path: '/values/',
  title: 'Values',
  description:
    'Veritas, Testimonium, Fraternitas, Ars — the four values behind every VIRI VERI Productions ' +
    'project, written down so the work can be measured against them.',
  body,
};

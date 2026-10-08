import { faq } from '../data/faq.mjs';
import { esc, each, raw, oneLine, slug } from '../lib/html.mjs';
import { btn, pageHeader } from '../lib/components.mjs';

const body = () => `
${pageHeader({
  eyebrow: 'Questions',
  title: 'Frequently asked',
  lede: 'The things people ask most about the company, the case, and the work.',
})}

<section class="section">
  <div class="container">
    <div class="faq-list">
      ${each(
        faq,
        (item) => `
      <details class="faq-item" id="${esc(slug(oneLine(item.q)))}">
        <summary>
          <span>${raw(item.q)}</span>
          <span class="faq-item__icon" aria-hidden="true"></span>
        </summary>
        <div class="faq-item__answer"><p>${raw(item.a)}</p></div>
      </details>`,
      )}
    </div>
  </div>
</section>

<section class="section section--dim">
  <div class="container" data-reveal>
    <p class="eyebrow">Not answered here</p>
    <h2 style="font-size:var(--step-3);max-width:20ch">Ask us directly.</h2>
    <div class="btn-row">
      ${btn({ href: '/contact/', label: 'Contact', variant: 'primary' })}
      ${btn({ href: '/our-story/', label: 'Our story', variant: 'secondary' })}
    </div>
  </div>
</section>
`;

export default {
  path: '/faq/',
  title: 'FAQ',
  description:
    'Answers about VIRI VERI Productions, the Clearly Established case record, the erasure of ' +
    'June 12, 2000, rights and representation, and how to reach us.',
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: oneLine(item.q),
        acceptedAnswer: { '@type': 'Answer', text: oneLine(item.a) },
      })),
    },
  ],
  body,
};

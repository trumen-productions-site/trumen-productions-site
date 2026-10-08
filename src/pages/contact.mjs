import { site } from '../site.config.mjs';
import { esc, each, when, mailto } from '../lib/html.mjs';
import { btn, pageHeader, sectionHead } from '../lib/components.mjs';

/**
 * Four routes, four addresses.
 *
 * Every button opens the visitor's own mail client with the subject already
 * filled in. There is no form endpoint, no third-party form service, and
 * nothing to be breached — which is why the page can honestly promise that an
 * address goes to one inbox and nowhere else.
 */
const routes = [
  {
    id: 'general',
    title: 'General inquiries',
    body:
      'Questions about the company, the books, the film, or anything else on this site. We ' +
      'read everything and answer what we can.',
    address: site.contact.general,
    subject: site.subjects.general,
    label: 'Email us',
  },
  {
    id: 'rights',
    title: 'Rights & representation',
    body:
      'Underlying rights, life rights, publishing, territory and format licensing, and agency ' +
      'representation. Life rights are held by the authors; we licence windows, not the record.',
    address: site.contact.rights,
    subject: site.subjects.rights,
    label: 'Rights inquiry',
  },
  {
    id: 'financing',
    title: 'Financing & production',
    body:
      'Equity, co-financing, a production home, or a lead attachment for the feature. The ' +
      'screenplay is complete and life rights are held by the authors.',
    address: site.contact.financing,
    subject: site.subjects.financing,
    label: 'Financing inquiry',
  },
  {
    id: 'press',
    title: 'Press',
    body:
      'Interviews, review copies, and factual verification. We will point you to the primary ' +
      'documents behind anything we have published.',
    address: site.contact.press,
    subject: site.subjects.press,
    label: 'Press inquiry',
  },
];

const body = () => `
${pageHeader({
  eyebrow: 'Contact',
  title: 'Tell us who you are and what you are considering.',
  lede: 'We will come back to you.',
  meta: 'Every button below opens your own mail client — no form service in between.',
})}

<section class="section">
  <div class="container">
    <div class="contact-grid">
      ${each(
        routes,
        (r) => `
      <article class="contact-card" id="${esc(r.id)}" data-reveal>
        <h2 class="contact-card__title">${esc(r.title)}</h2>
        <p class="contact-card__body">${esc(r.body)}</p>
        <p class="contact-card__address">
          <a href="${esc(mailto(r.address, r.subject))}">${esc(r.address)}</a>
        </p>
        <div class="btn-row" style="margin-top:var(--sp-4)">
          ${btn({ href: mailto(r.address, r.subject), label: r.label, variant: 'primary' })}
        </div>
      </article>`,
      )}
    </div>

    ${when(
      site.contact.phone || site.contact.mailingAddress,
      `<div class="section section--tight" data-reveal>
        ${when(site.contact.phone, `<p><strong>Telephone:</strong> <a href="tel:${esc(String(site.contact.phone).replace(/[^+\d]/g, ''))}">${esc(site.contact.phone)}</a></p>`)}
        ${when(site.contact.mailingAddress, `<p><strong>Post:</strong> ${esc(site.contact.mailingAddress)}</p>`)}
      </div>`,
    )}
  </div>
</section>

<section class="section section--dim">
  <div class="container">
    <div data-reveal>
      ${sectionHead({
        label: 'Before you write',
        title: 'Three things that save us both a round trip',
      })}
    </div>
    <div class="card-grid card-grid--3">
      <div class="card" data-reveal>
        <div class="rule" aria-hidden="true"></div>
        <p class="card__num">01</p>
        <h3 class="card__title">Say who you are</h3>
        <p class="card__body">Company, role, and whether you are asking on your own behalf or a client’s.</p>
      </div>
      <div class="card" data-reveal>
        <div class="rule" aria-hidden="true"></div>
        <p class="card__num">02</p>
        <h3 class="card__title">Say which project</h3>
        <p class="card__body">Memoir, legal volume, feature, series, or documentary — they have different rights positions.</p>
      </div>
      <div class="card" data-reveal>
        <div class="rule" aria-hidden="true"></div>
        <p class="card__num">03</p>
        <h3 class="card__title">Say what you want</h3>
        <p class="card__body">A read, a call, a window, an option. We would rather answer a specific ask than guess at one.</p>
      </div>
    </div>
  </div>
</section>

<section class="section section--ink on-ink">
  <div class="container" data-reveal>
    <p class="eyebrow">While you are here</p>
    <h2 style="font-size:var(--step-3);max-width:20ch">Two minutes on the featured project.</h2>
    <div class="btn-row">
      ${btn({ href: '/clearly-established/pitch/', label: 'Watch the pitch', variant: 'primary' })}
      ${btn({ href: '/projects/', label: 'The slate', variant: 'secondary' })}
    </div>
  </div>
</section>
`;

export default {
  path: '/contact/',
  title: 'Contact',
  description:
    'Contact VIRI VERI Productions — general inquiries, rights and representation, financing and ' +
    'production partnership, and press.',
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      url: `${site.url}/contact/`,
      about: { '@id': `${site.url}/#organization` },
    },
  ],
  body,
};

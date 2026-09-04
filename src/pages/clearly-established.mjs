import { site, facts, quotes } from '../site.config.mjs';
import { film, showCastingVision } from '../data/film.mjs';
import { esc, each, when, mailto } from '../lib/html.mjs';
import { btn, sectionHead, statBand, pullQuote, numberedCard, ruleRow, pageHeader } from '../lib/components.mjs';

const body = () => `
${pageHeader({
  eyebrow: 'Featured project',
  title: 'Clearly Established',
  lede: film.keyline,
  meta: `${film.format} · ${film.genre} · ${film.source}`,
})}

<section class="section section--tight">
  <div class="container">
    <div class="btn-row" style="margin-top:0" data-reveal>
      ${btn({ href: '/clearly-established/pitch/', label: 'Watch the two-minute pitch', variant: 'primary' })}
      ${btn({ href: '/contact/#rights', label: 'Rights & representation', variant: 'secondary' })}
    </div>
  </div>
</section>

<section class="section section--warm">
  <div class="container">
    <div data-reveal>${sectionHead({ number: '01', label: 'Logline' })}</div>
    <p class="lede" data-reveal style="font-size:var(--step-2);max-width:38ch">${esc(film.logline)}</p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div data-reveal>${sectionHead({ number: '02', label: 'Synopsis', title: film.synopsis.kicker })}</div>
    <div class="prose" data-reveal>
      ${each(film.synopsis.paragraphs, (p) => `<p>${esc(p)}</p>`)}
    </div>
    ${pullQuote({ ...quotes.prosecutor, tone: 'display' })}
    ${pullQuote(quotes.judge)}
  </div>
</section>

<section class="section section--ink on-ink">
  <div class="container" data-reveal>
    ${statBand(
      [
        { value: facts.arrested.value, label: facts.arrested.label, detail: facts.arrested.detail },
        { value: facts.convicted.value, label: facts.convicted.label, detail: facts.convicted.detail },
        { value: facts.reversed.value, label: facts.reversed.label, detail: facts.reversed.detail },
        { value: facts.refiled.value, label: facts.refiled.label, detail: facts.refiled.detail },
      ],
      { tone: 'ink' },
    )}
  </div>
</section>

<section class="section">
  <div class="container">
    <div data-reveal>
      ${sectionHead({
        number: '03',
        label: 'The record',
        title: 'A conviction, a reversal, and a deletion.',
        lede: 'Three beats, each of them documented, each of them on the public record.',
      })}
    </div>
    ${each(
      film.beats,
      (b) => `
    <article class="spine-item" data-reveal>
      <div class="spine-item__grid">
        <div>
          <p class="eyebrow"><span class="eyebrow__num">${esc(b.number)}</span>${esc(b.label)}</p>
          <h3 class="spine-item__word" style="font-size:var(--step-3)">${esc(b.heading)}</h3>
        </div>
        <div class="prose">
          ${each(b.body, (p) => `<p>${esc(p)}</p>`)}
          ${when(
            b.punch.length,
            `<div class="spine-item__stat" style="border-top:0;padding-top:0">
              ${each(
                b.punch,
                (p) =>
                  `<p class="spine-item__stat-value${p.tone === 'red' ? ' text-accent' : ''}" style="max-width:26ch">${esc(p.text)}</p>`,
              )}
            </div>`,
          )}
        </div>
      </div>
    </article>`,
    )}
    ${pullQuote({ ...quotes.court, tone: 'display' })}
  </div>
</section>

<section class="question-panel on-brass">
  <div class="container" data-reveal>
    <p class="eyebrow">The question at the centre</p>
    <h2 class="question-panel__primary">${esc(film.questions.primary)}</h2>
    <p class="question-panel__secondary">${esc(film.questions.secondary)}</p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div data-reveal>
      ${sectionHead({ number: '04', label: 'The architecture', title: film.doctrine.heading, lede: film.doctrine.body })}
    </div>
    <div class="card-grid card-grid--2">
      ${each(
        film.doctrine.timelines,
        (tl) => `<div data-reveal>${numberedCard({ number: tl.label, title: tl.title, body: tl.body })}</div>`,
      )}
    </div>
  </div>
</section>

<section class="section section--dim">
  <div class="container">
    <div data-reveal>${sectionHead({ number: '05', label: 'Themes', title: 'What it’s really about.' })}</div>
    <div class="card-grid card-grid--3">
      ${each(
        film.themes,
        (th) => `<div data-reveal>${numberedCard({ number: th.number, title: th.title, body: th.body })}</div>`,
      )}
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div data-reveal>${sectionHead({ number: '06', label: 'Characters', title: 'Who carries the story.' })}</div>
    <div class="card-grid card-grid--2">
      ${each(
        film.characters,
        (ch) => `<div data-reveal>${numberedCard({
          number: ch.role,
          title: ch.name,
          body: `${esc(ch.body)}${when(showCastingVision && ch.castingVision, ` <span class="text-accent">Casting vision: ${esc(ch.castingVision)}.</span>`)}`,
        })}</div>`,
      )}
    </div>
    <p class="note" data-reveal>No roles are cast. We are seeking a lead attachment.</p>
  </div>
</section>

<section class="section section--ink on-ink">
  <div class="container">
    <div data-reveal>${sectionHead({ number: '07', label: 'Tone & texture', title: film.tone.heading, lede: film.tone.body })}</div>
    <ul class="player__chapters" data-reveal style="margin-top:0">
      ${each(film.tone.textures, (x) => `<li><span class="player__chapter" role="presentation">${esc(x)}</span></li>`)}
    </ul>
  </div>
</section>

<section class="section">
  <div class="container">
    <div data-reveal>${sectionHead({ number: '08', label: 'Director’s vision' })}</div>
    <div data-reveal>
      ${pullQuote({ text: film.directorsVision.quote, attribution: film.directorsVision.attribution, tone: 'display' })}
    </div>
    <div class="prose" data-reveal>${each(film.directorsVision.body, (p) => `<p>${esc(p)}</p>`)}</div>
  </div>
</section>

<section class="section section--warm">
  <div class="container">
    <div data-reveal>${sectionHead({ number: '09', label: 'In the vein of', title: 'Where this film lives.' })}</div>
    ${each(
      film.comparables,
      (c) => `<div data-reveal>${ruleRow({ title: c.title, meta: c.year, body: c.body })}</div>`,
    )}
  </div>
</section>

<section class="section">
  <div class="container">
    <div data-reveal>${sectionHead({ number: '10', label: 'Why now', title: film.whyNow.heading })}</div>
    <div class="card-grid card-grid--3">
      ${each(film.whyNow.points, (p) => `<div data-reveal>${numberedCard({ title: p.title, body: p.body })}</div>`)}
    </div>
  </div>
</section>

<section class="section section--dim">
  <div class="container">
    <div data-reveal>
      ${sectionHead({ number: '11', label: 'Scale & financing', title: film.scale.heading, lede: film.scale.body })}
    </div>
    ${when(
      film.scale.budgetTier,
      `<p class="lede" data-reveal><strong>Indicative budget tier:</strong> ${esc(film.scale.budgetTier)}</p>`,
    )}
    <div class="card-grid card-grid--4">
      ${each(film.scale.points, (p) => `<div data-reveal>${numberedCard({ title: p.title, body: p.body })}</div>`)}
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div data-reveal>${sectionHead({ number: '12', label: 'The ask', title: 'What we’re looking for.' })}</div>
    <div class="card-grid card-grid--3">
      ${each(
        film.ask,
        (a) => `<div data-reveal>${numberedCard({ number: a.number, title: a.title, body: a.body })}</div>`,
      )}
    </div>
    <p class="page-header__meta" data-reveal style="margin-top:var(--sp-7)">Status · ${esc(film.status)}</p>
    <div class="btn-row" data-reveal>
      ${btn({
        href: mailto(site.contact.financing, site.subjects.financing),
        label: 'Financing & production',
        variant: 'primary',
      })}
      ${btn({ href: mailto(site.contact.rights, site.subjects.rights), label: 'Rights & representation', variant: 'secondary' })}
    </div>
  </div>
</section>

<section class="section section--ink on-ink">
  <div class="container" data-reveal>
    <p class="eyebrow">${esc(film.format)}</p>
    <h2 style="font-size:var(--step-4);max-width:14ch">${esc(film.closing.line)}</h2>
    <p class="lede">${esc(film.closing.body)}</p>
    <div class="btn-row">
      ${btn({ href: '/clearly-established/pitch/', label: 'Watch the pitch', variant: 'primary' })}
      ${btn({ href: '/projects/', label: 'The whole slate', variant: 'secondary' })}
    </div>
  </div>
</section>
`;

export default {
  path: '/clearly-established/',
  title: 'Clearly Established',
  description:
    'Clearly Established — a feature film based on a true story. South Carolina convicted ' +
    'Michael Martin of a murder its own prosecutor admitted the State could not prove. Its ' +
    'Supreme Court reversed unanimously — then deleted the finding of innocence from its own ' +
    'opinion.',
  ogType: 'article',
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'Movie',
      name: 'Clearly Established',
      description: film.logline,
      genre: film.genre,
      url: `${site.url}/clearly-established/`,
      productionCompany: { '@id': `${site.url}/#organization` },
      author: [
        { '@type': 'Person', name: 'Michael Anthony Martin' },
        { '@type': 'Person', name: 'David Alexander Martin' },
      ],
      isBasedOn: {
        '@type': 'Book',
        name: 'Clearly Established',
        author: [
          { '@type': 'Person', name: 'Michael Anthony Martin' },
          { '@type': 'Person', name: 'David Alexander Martin' },
        ],
      },
    },
  ],
  body,
};

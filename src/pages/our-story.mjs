import { site } from '../site.config.mjs';
import { spine, brothers, values } from '../data/company.mjs';
import { esc, each, when } from '../lib/html.mjs';
import { btn, sectionHead, pageHeader, numberedCard, tag } from '../lib/components.mjs';

const body = () => `
${pageHeader({
  eyebrow: 'Our story',
  title: 'We exist to tell true stories that hold up.',
  lede: 'In court, on the page, and on screen.',
  meta: `${site.legalEntity} · doing business as ${site.name}`,
})}

<section class="section">
  <div class="container">
    <div class="featured" data-reveal>
      <div>
        ${sectionHead({ label: 'The company', title: 'A family company, on the record' })}
      </div>
      <div class="prose">
        <p>
          VIRI VERI Productions was founded by brothers David and Michael Martin. One of us lived
          the years. One of us kept the file. Both of us decided that the only answer to a record
          that could be revised was to build one that could not.
        </p>
        <p>
          We make books, film, television and documentary from the same source material: primary
          documents. Every project starts with something filed, recorded, or deeded — and every
          claim we publish traces back to it.
        </p>
        <p>
          Our motto is <em>Viri Veri</em> — men of truth. It is on the mark, and it is the
          standard we are asking to be held to.
        </p>
      </div>
    </div>
  </div>
</section>

<section class="section section--dim" id="the-spine">
  <div class="container">
    <div data-reveal>
      ${sectionHead({
        label: 'The spine of the work',
        title: 'Three words, one family',
        lede:
          'Everything we make sits on one of three beats. The State convicted a man, and its ' +
          'highest court said so — unanimously. Then the words that said so were erased. And a ' +
          'century earlier, the same family’s land was taken without lawful basis. The 860 ' +
          'acres are not a detail. They are the third beat.',
      })}
    </div>

    ${each(
      spine,
      (b) => `
    <article class="spine-item" id="${esc(b.id)}" data-reveal style="scroll-margin-top:6rem">
      <div class="spine-item__grid">
        <div>
          <p class="eyebrow"><span class="eyebrow__num">${esc(b.number)}</span>${esc(b.subtitle)}</p>
          <h3 class="spine-item__word">${esc(b.word)}</h3>
          <div class="spine-item__stat">
            <span class="spine-item__stat-value">${esc(b.stat.value)}</span>
            <span class="spine-item__stat-label">${esc(b.stat.label)}</span>
          </div>
          <p class="spine-item__cite" style="margin-top:var(--sp-3)">${esc(b.cite)}</p>
          <ul class="spine-item__formats">
            ${each(b.formats, (f) => `<li>${tag(f, { tone: 'neutral' })}</li>`)}
          </ul>
        </div>
        <div class="prose">
          ${when(b.etymology, `<p class="spine-item__etym">${esc(b.etymology)}</p>`)}
          ${each(b.body, (p) => `<p>${esc(p)}</p>`)}
        </div>
      </div>
    </article>`,
    )}
  </div>
</section>

<section class="section" id="the-brothers">
  <div class="container">
    <div data-reveal>
      ${sectionHead({
        label: 'Meet the brothers',
        title: 'Two names, one chain of title',
        lede: 'Fifty-fifty, on paper, from the beginning. No decision is made without the other.',
      })}
    </div>
    <div class="card-grid card-grid--2">
      ${each(
        brothers,
        (b) => `
      <article data-reveal id="${esc(b.id)}" style="scroll-margin-top:6rem">
        <div class="rule" aria-hidden="true"></div>
        <p class="card__num">${esc(b.role)}</p>
        <h3 class="card__title" style="max-width:none">${esc(b.name)}</h3>
        <div class="prose">${each(b.bio, (p) => `<p>${esc(p)}</p>`)}</div>
      </article>`,
      )}
    </div>
  </div>
</section>

<section class="section section--ink on-ink">
  <div class="container">
    <div data-reveal>
      ${sectionHead({
        label: 'What we will not trade away',
        title: 'Four core values',
        lede: 'Written down so the work — and the people who make it — can be measured against them.',
      })}
    </div>
    <div class="card-grid card-grid--4">
      ${each(
        values,
        (v) => `<div data-reveal>${numberedCard({
          number: v.latin,
          title: v.english,
          body: v.summary,
          href: `/values/#${v.id}`,
          linkLabel: 'Read the value',
        })}</div>`,
      )}
    </div>
  </div>
</section>

<section class="section section--warm">
  <div class="container" data-reveal>
    <p class="eyebrow">Next</p>
    <h2 style="font-size:var(--step-3);max-width:20ch">One story, every format it deserves.</h2>
    <div class="btn-row">
      ${btn({ href: '/projects/', label: 'The slate', variant: 'primary' })}
      ${btn({ href: '/clearly-established/', label: 'Clearly Established', variant: 'secondary' })}
    </div>
  </div>
</section>
`;

export default {
  path: '/our-story/',
  title: 'Our story',
  description:
    'VIRI VERI Productions — founded by brothers Michael and David Martin. The spine of the work: ' +
    'Provocation, Prevarication, Revocation. Three beats, one family, all on the record.',
  body,
};

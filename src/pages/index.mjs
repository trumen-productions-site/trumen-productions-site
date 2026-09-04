import { site, facts } from '../site.config.mjs';
import { spine, values, news } from '../data/company.mjs';
import { formats } from '../data/projects.mjs';
import { film } from '../data/film.mjs';
import { esc, each, raw } from '../lib/html.mjs';
import { wordmark, btn, sectionHead, statBand, numberedCard } from '../lib/components.mjs';
import { titleTeaser } from '../lib/pitch-stage.mjs';

/** The abstract court page, as a static graphic. Its animated twin is in the pitch. */
function recordGraphic() {
  return `
<figure class="record" aria-labelledby="record-caption">
  <p class="record__head">Supreme Court of South Carolina</p>
  <div class="record__divider"></div>
  <div class="record__lines" aria-hidden="true">
    ${each([96, 90, 98, 86, 94, 70], (w) => `<div class="record__line" style="width:${w}%"></div>`)}
  </div>
  <p class="record__opinion">Opinion No. 25093 — filed March 27, 2000</p>
  <p class="record__verdict">Reversed — “Impossible”</p>
  <div class="record__struck">
    <p class="record__struck-label"><span>Last three paragraphs</span><span>Deleted</span></p>
    <div class="record__lines" aria-hidden="true">
      ${each([95, 88, 97, 62], (w) => `<div class="record__line" style="width:${w}%"></div>`)}
    </div>
  </div>
  <figcaption class="visually-hidden" id="record-caption">
    An illustration of the Court’s opinion: the filed reversal of March 27, 2000, with the last
    three paragraphs — the findings of innocence — struck through and deleted.
  </figcaption>
</figure>`;
}

const body = () => `
<section class="hero on-ink">
  <div class="hero__grid" aria-hidden="true"></div>
  <div class="container hero__inner">
    <div>
      <h1 class="hero__mark">
        ${wordmark({ size: 'xl', productions: true, motto: true })}
        <span class="visually-hidden">${esc(site.namePlain)} — ${esc(site.motto)}</span>
      </h1>
      <p class="hero__tagline">${esc(site.tagline)}</p>
      <p class="hero__founded">${esc(site.foundedLine)}</p>
      <div class="btn-row">
        ${btn({ href: '/clearly-established/', label: 'Clearly Established', variant: 'primary' })}
        ${btn({ href: '/our-story/', label: 'Our story', variant: 'secondary' })}
      </div>
    </div>
    <div class="teaser" data-pitch='{"duration":10,"loop":true,"autoplay":true,"poster":6}'>
      ${titleTeaser()}
      <a class="teaser__link" href="/clearly-established/pitch/">
        <span class="teaser__cta">Watch the pitch — 2 min</span>
      </a>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="featured" data-reveal>
      <div>
        ${sectionHead({ label: 'Featured project', title: 'Clearly Established' })}
        <div class="prose">
          <p>
            In 1996, at twenty-six, Michael Martin was arrested. In 1997 he was convicted. On
            March 27, 2000, the Supreme Court of South Carolina reversed that conviction —
            unanimously.
          </p>
          <p>
            Between those dates: three years and eleven months in prison, and seventy-seven
            days held past the point the law allowed — the exact span between the opinion that
            freed him and the version filed in its place.
          </p>
          <p>
            <em>Clearly Established</em> is the memoir of what happened — the conviction, the
            unanimous reversal, and the erasure that followed it — told by the man it happened to
            and the brother who watched, and backed, line by line, by the record.
          </p>
        </div>
        <div class="btn-row">
          ${btn({ href: '/clearly-established/', label: 'Read the full story', variant: 'primary' })}
          ${btn({ href: '/clearly-established/pitch/', label: 'Watch the pitch', variant: 'secondary' })}
        </div>
      </div>
      <div>${recordGraphic()}</div>
    </div>
  </div>
</section>

<section class="section section--ink on-ink">
  <div class="container" data-reveal>
    ${statBand(
      [
        { value: 'Unanimous', label: 'S.C. Supreme Court reversal' },
        { value: facts.incarcerated.value, label: facts.incarcerated.label },
        { value: facts.memoirWords.value, label: facts.memoirWords.label },
        { value: facts.seriesEpisodes.value, label: facts.seriesEpisodes.label },
        { value: facts.acres.value, label: facts.acres.label },
      ],
      { tone: 'ink' },
    )}
  </div>
</section>

<section class="section">
  <div class="container">
    <div data-reveal>
      ${sectionHead({
        label: 'The spine of the work',
        title: 'Three words, one family',
        lede:
          'Everything we make sits on one of three beats. The State convicted a man, and its ' +
          'highest court said so — unanimously. Then the words that said so were erased. And a ' +
          'century earlier, the same family’s land was taken without lawful basis. The 860 acres ' +
          'are not a detail. They are the third beat.',
      })}
    </div>
    <div class="card-grid card-grid--3">
      ${each(
        spine,
        (b) => `<div data-reveal>${numberedCard({
          number: b.number,
          title: b.word,
          body: `<strong>${esc(b.subtitle)}</strong><br>${esc(b.body[0])}`,
          href: `/our-story/#${b.id}`,
          linkLabel: 'Read the beat',
        })}</div>`,
      )}
    </div>
  </div>
</section>

<section class="section section--dim">
  <div class="container">
    <div data-reveal>
      ${sectionHead({ label: 'What we make', title: 'One story, every format it deserves' })}
    </div>
    <div class="card-grid card-grid--4">
      ${each(
        formats,
        (f) => `<div data-reveal>${numberedCard({ title: f.title, body: f.body, href: f.href, linkLabel: 'See the project' })}</div>`,
      )}
    </div>
    <div class="btn-row" data-reveal>
      ${btn({ href: '/projects/', label: 'All projects', variant: 'secondary' })}
    </div>
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
      ${sectionHead({
        label: 'Our core values influence everything we make',
        title: 'Four things we will not trade away',
        lede:
          'Behind every page and every frame is a set of beliefs that shaped it. Ours are ' +
          'written down so that the work — and the people who make it — can be measured ' +
          'against them.',
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

<section class="section section--tight section--warm">
  <div class="container">
    <div data-reveal>${sectionHead({ label: 'Latest', title: 'From the company' })}</div>
    <div class="news-list">
      ${each(
        news.slice().reverse().slice(0, 4),
        (n) => `
      <article class="news-item" data-reveal>
        <p class="news-item__date"><time datetime="${esc(n.date)}">${esc(n.dateLabel)}</time></p>
        <h3 class="news-item__title">${raw(n.title)}</h3>
        <p class="news-item__body">${esc(n.body)}</p>
      </article>`,
      )}
    </div>
  </div>
</section>
`;

export default {
  path: '/',
  title: 'Home',
  description: site.description,
  css: ['/assets/css/pitch.css'],
  js: ['/assets/js/pitch.js'],
  body,
};

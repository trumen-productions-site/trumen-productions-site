import { projects, statusLabels } from '../data/projects.mjs';
import { esc, each, when } from '../lib/html.mjs';
import { btn, pageHeader, tag } from '../lib/components.mjs';

const body = () => `
${pageHeader({
  eyebrow: 'The slate',
  title: 'One story, every format it deserves',
  lede:
    'Five projects, two beats, one record. Each of them built from the same primary documents ' +
    'and owned by the authors.',
  meta: `${projects.length} projects · Rights held by the authors`,
})}

<section class="section">
  <div class="container">
    ${each(
      projects,
      (p) => `
    <article class="project" id="${esc(p.id)}" data-reveal>
      <div class="project__grid">
        <div>
          <p class="project__kind">${esc(p.kind)}</p>
          <h2 class="project__title">${esc(p.title)}</h2>
          <p class="project__subtitle">${esc(p.subtitle)}</p>
          <p class="project__byline">${esc(p.byline)}</p>
          <p style="margin-top:var(--sp-5)">
            ${tag(statusLabels[p.status] || p.status, { tone: p.status === 'complete' ? 'complete' : 'accent' })}
          </p>
          <dl class="project__facts">
            ${each(
              p.facts,
              ([k, v]) => `<div class="project__fact"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`,
            )}
            <div class="project__fact"><dt>Status</dt><dd>${esc(p.statusDetail)}</dd></div>
          </dl>
        </div>
        <div>
          <p class="lede">${esc(p.summary)}</p>
          <div class="prose">${each(p.body, (para) => `<p>${esc(para)}</p>`)}</div>
          ${when(
            p.linkLabel,
            `<div class="btn-row">${btn({ href: p.href, label: p.linkLabel, variant: 'secondary' })}</div>`,
          )}
        </div>
      </div>
    </article>`,
    )}
  </div>
</section>

<section class="section section--ink on-ink">
  <div class="container" data-reveal>
    <p class="eyebrow">How we license</p>
    <h2 style="font-size:var(--step-3);max-width:22ch">We licence a window. We do not sell the record.</h2>
    <p class="lede">
      Life rights and underlying rights to every project above are held by the authors through
      ${esc('Revelatory Productions, LLC')}. We are glad to discuss exclusive windows,
      territories, and formats — and we keep the underlying rights, including any use of the
      work to train a model.
    </p>
    <div class="btn-row">
      ${btn({ href: '/contact/#rights', label: 'Rights & representation', variant: 'primary' })}
      ${btn({ href: '/contact/#financing', label: 'Financing & production', variant: 'secondary' })}
    </div>
  </div>
</section>
`;

export default {
  path: '/projects/',
  title: 'Projects',
  description:
    'The VIRI VERI Productions slate: the memoir Clearly Established, the companion legal volume ' +
    'The Liberty Argument, a completed feature screenplay, an eighty-episode vertical series, ' +
    'and the documentary Estelusti: What They Outlived.',
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'VIRI VERI Productions — the slate',
      itemListElement: projects.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${p.title} — ${p.subtitle}`,
        description: p.summary,
      })),
    },
  ],
  body,
};

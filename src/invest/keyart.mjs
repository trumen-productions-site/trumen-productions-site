/**
 * The key art — typographic, built from the locked identity (HANDOFF.md
 * § 9.2): the green § above the title, the title in the document serif, the
 * scales beneath, a brass rule, all on the navy field. No photography, no
 * generated faces, no third-party artwork. The same drawing is rasterised
 * for the Open Graph card by tools/make-images.mjs.
 */

const NAVY = '#0b1f3a';
const CREAM = '#f3ebdd';
const BRASS = '#b08d57';
const GREEN = '#2e6b4f';
const GOLD = '#d4af37';

const STAR = 'M12 1.6l2.9 7.1 7.7.5-5.9 4.9 1.9 7.4-6.6-4.1-6.6 4.1 1.9-7.4L1.4 9.2l7.7-.5z';

/**
 * The scales: a post, a beam, two pans. Drawn plainly on purpose — the one
 * decorative object on a page of straight lines.
 */
function scales(x, y, scale = 1, stroke = BRASS) {
  return `
<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <line x1="110" y1="8" x2="110" y2="120"/>
  <line x1="70" y1="124" x2="150" y2="124"/>
  <line x1="18" y1="30" x2="202" y2="30"/>
  <circle cx="110" cy="8" r="5" fill="${stroke}"/>
  <line x1="18" y1="30" x2="4" y2="82"/><line x1="18" y1="30" x2="32" y2="82"/>
  <path d="M-10 82 Q18 110 46 82"/>
  <line x1="202" y1="30" x2="188" y2="82"/><line x1="202" y1="30" x2="216" y2="82"/>
  <path d="M174 82 Q202 110 230 82"/>
</g>`;
}

/**
 * The art, as an inline SVG. `label` gives it an accessible name; pass
 * `decorative: true` where the surrounding text already says what it is.
 */
export function keyArt({ width = 600, height = 750, decorative = false, id = 'keyart' } = {}) {
  const a11y = decorative ? 'aria-hidden="true"' : `role="img" aria-label="Clearly Established — the section mark, the title, and the scales of justice on a navy field"`;
  return `
<svg class="inv-keyart" viewBox="0 0 600 750" width="${width}" height="${height}" ${a11y} xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="${id}-grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="${CREAM}" stroke-opacity="0.07" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="600" height="750" fill="${NAVY}"/>
  <rect width="600" height="750" fill="url(#${id}-grid)"/>
  <rect x="24" y="24" width="552" height="702" fill="none" stroke="${BRASS}" stroke-opacity="0.5" stroke-width="1.5"/>
  <text x="300" y="200" text-anchor="middle" font-family="Georgia, 'Iowan Old Style', 'Times New Roman', serif" font-size="124" fill="${GREEN}">§</text>
  <text x="300" y="318" text-anchor="middle" font-family="Georgia, 'Iowan Old Style', 'Times New Roman', serif" font-size="58" letter-spacing="6" fill="${CREAM}">CLEARLY</text>
  <text x="300" y="392" text-anchor="middle" font-family="Georgia, 'Iowan Old Style', 'Times New Roman', serif" font-size="58" letter-spacing="6" fill="${CREAM}">ESTABLISHED</text>
  <line x1="200" y1="430" x2="400" y2="430" stroke="${BRASS}" stroke-width="3"/>
  ${scales(190, 470, 1)}
  <text x="300" y="668" text-anchor="middle" font-family="Georgia, 'Iowan Old Style', 'Times New Roman', serif" font-size="17" font-style="italic" letter-spacing="2" fill="${BRASS}">A true story from the public record</text>
  <g transform="translate(236 686)">
    <text x="0" y="16" font-family="Poppins, 'Helvetica Neue', Arial, sans-serif" font-style="italic" font-weight="700" font-size="18" letter-spacing="1" fill="${CREAM}">TRU</text>
    <g transform="translate(42 1) scale(0.72)"><path d="${STAR}" fill="${GOLD}"/></g>
    <text x="64" y="16" font-family="Poppins, 'Helvetica Neue', Arial, sans-serif" font-style="italic" font-weight="700" font-size="18" letter-spacing="1" fill="${CREAM}">MEN</text>
  </g>
</svg>`.trim();
}

/** A 1200×630 card for the Open Graph image, rendered by tools/make-images.mjs. */
export function keyArtCard() {
  return `
<svg viewBox="0 0 1200 630" width="1200" height="630" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Invest in Clearly Established">
  <rect width="1200" height="630" fill="${NAVY}"/>
  <rect x="32" y="32" width="1136" height="566" fill="none" stroke="${BRASS}" stroke-opacity="0.5" stroke-width="2"/>
  <text x="120" y="190" font-family="Georgia, serif" font-size="110" fill="${GREEN}">§</text>
  <text x="120" y="300" font-family="Georgia, serif" font-size="64" letter-spacing="6" fill="${CREAM}">CLEARLY</text>
  <text x="120" y="378" font-family="Georgia, serif" font-size="64" letter-spacing="6" fill="${CREAM}">ESTABLISHED</text>
  <line x1="120" y1="420" x2="420" y2="420" stroke="${BRASS}" stroke-width="3"/>
  <text x="120" y="478" font-family="Georgia, serif" font-size="26" font-style="italic" fill="${BRASS}">A true story from the public record · Private offering · Accredited investors only</text>
  ${scales(820, 160, 1.4)}
  <g transform="translate(120 540)">
    <text x="0" y="24" font-family="Poppins, sans-serif" font-style="italic" font-weight="700" font-size="28" letter-spacing="1" fill="${CREAM}">TRU</text>
    <g transform="translate(62 2) scale(1.1)"><path d="${STAR}" fill="${GOLD}"/></g>
    <text x="96" y="24" font-family="Poppins, sans-serif" font-style="italic" font-weight="700" font-size="28" letter-spacing="1" fill="${CREAM}">MEN</text>
    <text x="178" y="24" font-family="Poppins, sans-serif" font-weight="500" font-size="16" letter-spacing="6" fill="${CREAM}">PRODUCTIONS</text>
  </g>
</svg>`.trim();
}

export default keyArt;

# Ads — the investor page

What the paid-social campaign has to do for the page to measure it, and the rules the creative must follow. Gate
`G_ADS` is Michael's signature that this document has been followed.

## Before any campaign is created

1. **Confirm Meta's current rules for advertising financial products and services**, and whether a *special ad
   category* applies to a private securities offering, in the Meta Business Help Center on the day the account is
   set up. These rules change; this file records the requirement to check, not the answer.
2. Confirm with securities counsel (gate `G_SECURITIES`) that the ad copy itself is within the general-solicitation
   rules of the exemption relied on. The ad is part of the solicitation.
3. Decide the attribution posture with counsel: the page runs with `features.metaPixel = false` by default — no
   pixel, no Conversions API, no consent banner. Server-side events in D1 are the source of truth either way, so
   the funnel can be read by UTM alone. Turn the pixel on only with counsel's direction and `G_ADS`.

## UTM naming

Every ad URL carries all six parameters and nothing else, so the funnel SQL in `RUNBOOK.md` reads cleanly. The
page captures the first touch for the session and attaches it to the lead.

| Parameter | Value | Example |
|---|---|---|
| `utm_source` | the platform | `meta` |
| `utm_medium` | always | `paid-social` |
| `utm_campaign` | `ce-<objective>-<yyyymm>` | `ce-launch-202611` |
| `utm_content` | `<format>-<hook>-<v>` — one per creative | `reel-record-v2`, `static-caseno-v1` |
| `utm_term` | the audience | `accredited-lookalike-1`, `sc-business-owners` |
| `utm_id` | the platform's campaign id | `120212345678901234` |

`fbclid` is appended by Meta and captured too. A URL, assembled:

```
https://<domain>/invest/?utm_source=meta&utm_medium=paid-social&utm_campaign=ce-launch-202611&utm_content=reel-record-v2&utm_term=accredited-lookalike-1&utm_id=120212345678901234
```

Read the result by `utm_content`, by **booked calls**, not clicks.

## Ad copy rules

- **Accredited-only language in every ad.** "For accredited investors" or "Accredited investors only" appears in
  the primary text or the headline, not only on the page.
- **No return figures in ad text.** No multiples, no percentages, no "target", no "projected". Those live on the
  page, with their footnotes in view.
- **No tax claims.** Not "write-off", not "deduction", not "passive income" — in ads or on the page, until `G_TAX`.
- **No promises.** Nothing that reads as safe, guaranteed, or low-risk. The page's forbidden list is the ad's too.
- **Only the facts the page states, stated the same way.** 1996, twenty-six, 1997, three years and eleven months,
  a unanimous reversal on March 27, 2000, Op. No. 25093. Nothing about any official, lawyer or other person.
- **Only the two authors are named.** No studio, platform, partner, sponsor, agent or manager. No casting names.
- **The mark is `TRU★MEN Productions`**, with the star, in every placement that carries it.
- **Not an offer.** Where character count allows, "Not an offer of securities." Always on the landing page.

## Creative checklist

- [ ] Primary text, headline and description each checked against the rules above
- [ ] Typographic creative only — no stock photography of people, no third-party artwork, no studio posters
- [ ] Destination URL carries all six UTMs; tested in a browser; the lead appears in the export with them
- [ ] Each creative has its own `utm_content`
- [ ] Caption or on-screen text carries "Accredited investors only"
- [ ] Landing page is the production build (`npm run build:prod`), not staging — no ribbon, no `[[PENDING]]`
- [ ] Counsel's written clearance for this creative is on file (gate `G_COPY` covers page copy, not ads)
- [ ] `G_ADS` signed in `src/invest/config/gates.json`

## What the page sends to Meta, if ever enabled

With `features.metaPixel = true` **and** the visitor's consent in the banner: the pixel on the page, and from the
server the Conversions API events `Lead` (details saved) and `Schedule` (call booked) with hashed email and phone as
match keys. Never the amount range, never the accredited answer, never any name. `functions/api/_lib/capi.js`.

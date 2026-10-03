# CLEARLY ESTABLISHED — Investor Page · Counsel Review Packet
Generated 2026-10-03 from build `d7714d4d0fa4` (staging). Regenerate with `npm run counsel:packet`; do not edit by hand.

**Owner:** Michael Anthony Martin, Vice-President, Revelatory Productions, LLC · **Counsel of record:** Alexa Whiteside, Esq., WAM Entertainment Law

This packet is the whole page as staged, in plain text, with every undecided term marked `[[PENDING: …]]`. Nothing on the page can reach production until each gate below is signed in `src/invest/config/gates.json` and every pending term is decided in `src/invest/config/`.


## 1. Launch gates — signature lines

| Gate | Meaning | Signs | Status | Signature / date |
|---|---|---|---|---|
| `G_TRADEMARK` | Class 41 ITU filed for the mark (Gate G) | Alexa Whiteside | unsigned | _______________________ |
| `G_COPYRIGHT` | Copyright applications filed for the works named on the page | Alexa Whiteside | unsigned | _______________________ |
| `G_DBA` | TRU★MEN Productions name cleared and DBA registered, or footer set to legal name only | Alexa Whiteside | unsigned | _______________________ |
| `G_SECURITIES` | Securities counsel approved structure, issuer, documents, Form D and state notice plan, verification method | Securities counsel (via Alexa Whiteside) | unsigned | _______________________ |
| `G_COPY` | Every word on the page approved, including story claims and names | Alexa Whiteside | unsigned | _______________________ |
| `G_TAX` | Tax language approved — only required if features.taxSection is true (not required unless the tax section is on) | CPA / tax counsel | unsigned | _______________________ |
| `G_OUTREACH` | Counsel cleared public investor solicitation relative to introductions in progress | Alexa Whiteside + Michael Anthony Martin | unsigned | _______________________ |
| `G_ADS` | Ad account configured per docs/invest/ADS.md; creative approved | Michael Anthony Martin | unsigned | _______________________ |

## 2. Open decisions

| Key | Decision | Current value | Notes |
|---|---|---|---|
| `offering.production` | Which production the raise finances, and its shoot window | [[PENDING: shoot window]] | Default placeholder: Block One of the vertical series (Episodes 1–11), South Carolina. One production per page. |
| `offering.issuer` | Legal name and state of the single-purpose LLC | [[PENDING: issuer legal name and state of formation — securities counsel]] | Not yet formed. |
| `offering.totalRaise` | Total raise | [[PENDING: total raise]] |  |
| `offering.minimum` | Minimum investment | [[PENDING: minimum investment — interacts with the verification method]] | Interacts with the verification method; ask securities counsel. |
| `offering.waterfall` | Recoupment % to investors first, then profit split | [[PENDING: waterfall — investor-first recoupment % and the profit split after it]] |  |
| `offering.targetReturn` | Target multiple and the model behind it | set — see the draft on the page | Optional; currently unset, so the tile is hidden. Requires a written basis on file. |
| `offering.exemption` | Exemption relied on | [[PENDING: exemption — securities counsel (page copy assumes Rule 506(c))]] | Page copy assumes Rule 506(c). 506(b) is refused by the build. |
| `offering.escrow / collectionAccount` | Escrow; third-party collection account | [[PENDING: whether subscription funds are escrowed]] [[PENDING: whether a third-party collection account is used]] |  |
| `offering.useOfFunds` | Allocation percentages | [[PENDING: use-of-funds allocation — must sum to 100%]] | Must sum to 100. |
| `perks[].level` | Which perks, at which levels | [[PENDING: perk level — owner]] | EP-credit language needs review against guild and distributor practice. |
| `team[]` | Exact credits and bullets | set — see the draft on the page | Drafted; pending each person’s approval of the wording (gate G_COPY). |
| `features.counselDisplay` | Whether counsel is named on the page | set — see the draft on the page | Off; requires her written consent. |
| `site.booking.host` | Who takes the calls and which calendar | [[PENDING: booking host — who takes the calls and which calendar]] |  |
| `site.contact.email` | Public contact address | set — see the draft on the page | Currently michaelmartin@greenplanit.org; switch to the revelatoryproductions.com address when mail is restored. |
| `site.domain` | Production domain | [[PENDING: production domain — owner]] |  |
| `story.variant` | Which approved story wording to use | set — see the draft on the page | A (conservative) renders. B adds “The Court said it should have been impossible to convict him.” and needs an approver. |
| `legal.verification` | Accredited-verification sentence | [[PENDING: accredited-verification method and the third-party verifier — securities counsel]] |  |
| `legal.retention` | Record retention period for leads and consents | [[PENDING: record retention period for leads and consents — counsel]] |  |

## 2a. Reconciled: the day counts

HANDOFF.md phrases the detention as “held seventy-seven days past the Court’s order”. The record this repository locked on September 5, 2026 derives two numbers from dated documents in the case file: **seventy-seven days** between the two filings of the opinion (March 27 → June 12, 2000) and **ninety-three days** from the order to the remittitur of June 28, 2000 — the over-detention. The page states both for what each is and leads with the over-detention. Decided in `docs/invest/DECISIONS.md` D-04; recorded here as information. The two sentences as they render:

> Then the opinion that freed him was withdrawn and refiled seventy-seven days later, on June 12, 2000, with language removed — while the State held him ninety-three days past the Court’s order, until the remittitur of June 28, 2000.


## 3. Every pending value, by config path

- `offering.production.shootWindow` — shoot window
- `offering.issuer` — issuer legal name and state of formation — securities counsel
- `offering.exemption` — exemption — securities counsel (page copy assumes Rule 506(c))
- `offering.totalRaise` — total raise
- `offering.minimum` — minimum investment — interacts with the verification method
- `offering.waterfall` — waterfall — investor-first recoupment % and the profit split after it
- `offering.escrow` — whether subscription funds are escrowed
- `offering.collectionAccount` — whether a third-party collection account is used
- `offering.useOfFunds` — use-of-funds allocation — must sum to 100%
- `legal.verification` — accredited-verification method and the third-party verifier — securities counsel
- `legal.retention` — record retention period for leads and consents — counsel
- `perks.0.level` — perk level — owner
- `perks.1.level` — perk level — owner
- `perks.2.level` — perk level — owner
- `perks.3.level` — perk level — owner
- `perks.4.level` — perk level — owner
- `perks.5.level` — perk level — owner
- `site.domain` — production domain — owner
- `site.booking.host` — booking host — who takes the calls and which calendar

## 4. Feature flags in force

- `taxSection`: **false**
- `castingComps`: **false**
- `followList`: **false**
- `sms`: **false**
- `metaPixel`: **false**
- `counselDisplay`: **false**
- `comps`: **false**
- `marketing`: **true**

## 5. The story wording

**Variant A_conservative (renders)**

> In 1996, a twenty-six-year-old Cadillac salesman was arrested in South Carolina. In 1997 he was convicted. He served three years and eleven months before a unanimous South Carolina Supreme Court reversed the conviction on March 27, 2000. Then the opinion that freed him was withdrawn and refiled seventy-seven days later, on June 12, 2000, with language removed — while the State held him ninety-three days past the Court’s order, until the remittitur of June 28, 2000.

**Variant B_canon** — requires an approver

> In 1996, a twenty-six-year-old Cadillac salesman was arrested in South Carolina. In 1997 he was convicted. He served three years and eleven months before a unanimous South Carolina Supreme Court reversed the conviction on March 27, 2000. The Court said it should have been impossible to convict him. Then the opinion that freed him was withdrawn and refiled seventy-seven days later, on June 12, 2000, with language removed — while the State held him ninety-three days past the Court’s order, until the remittitur of June 28, 2000.

Facts the page states, exactly: arrested 1996 at twenty-six · convicted 1997 · three years and eleven months · unanimous reversal March 27, 2000, Op. No. 25093 · withdrawn and refiled June 12, 2000 (seventy-seven days later) · remittitur June 28, 2000 (ninety-three days after the order) · written by Michael Anthony Martin and David Alexander Martin · rights held by Revelatory Productions, LLC.

## 6. Disclaimers and required text

**Header and hero qualifier**

> Accredited investors only.

> Accredited investors only. Not an offer of securities.

**Risk sentence (FAQ)**

> This is a high-risk investment. You could lose some or all of your money. Most independent productions do not return their budgets. Full risk factors are in the offering documents.

**Not an offer (footer)**

> This page is for information only. It is not an offer to sell or a solicitation of an offer to buy any security. Offers are made only through definitive offering documents, and only to investors whose accredited status has been verified.

> Any targets, estimates or projections are the issuer’s own, rest on assumptions that may prove wrong, and are not a promise of performance. Nothing here is a guarantee of any outcome.

> Investing in a film or television production is speculative and involves a high degree of risk, including the loss of your entire investment. Most independent productions do not return their budgets. Tax outcomes vary by investor and by jurisdiction.

**Offering structure sentences (each renders only when its config value is decided and true)**

> _exemption506c_ — Interests are offered under Rule 506(c) of Regulation D, which permits general solicitation and limits sales to accredited investors whose status has been verified.

> _verification_ — Accredited status is verified before any subscription is accepted, by a third-party verifier or by review of documentation, as described in the offering documents.

> _escrow_ — Subscription funds are held in escrow until the minimum offering amount is reached and the closing conditions are met.

> _collectionAccount_ — Revenues from the production are paid into a third-party collection account and distributed under a collection account management agreement.

**Story notice**

> Based on the public record of State v. Martin, Op. No. 25093 (S.C. 2000), and the recollections of the authors.

**Accredited-investor helper (step 1)**

> Income over $200,000 in each of the last two years ($300,000 with a spouse or partner), with the same expected this year; or

> Net worth over $1,000,000, alone or with a spouse or partner, not counting your primary residence; or

> Certain professional licences in good standing (Series 7, 65 or 82), or an entity that meets its own tests.

> These are the general tests. The full definition is in Rule 501(a) of Regulation D; your status is verified before any subscription is accepted.

**Verification (FAQ)**

> [[PENDING: accredited-verification method and the third-party verifier — securities counsel]]

**Footnotes**

> _minimum_ — Minimum subscription per investor. The issuer may accept a smaller amount at its sole discretion. Terms are set out in full in the offering documents.

> _waterfall_ — Describes the order of distributions after expenses and reserves, as set out in the operating agreement of the issuer. Distributions are not assured; there may be none.

> _raise_ — The maximum amount the issuer intends to accept. The offering may close below this amount, and the production budget would be adjusted accordingly.

> _target_ — A target, not a forecast. Based on the written model on file with the issuer, which rests on assumptions that may not hold. Actual results may differ materially, and you may lose your entire investment.

> _tax_ — Tax treatment depends on your individual circumstances and on current law, which may change. Nothing here is tax advice. Consult your own adviser.

> _format_ — Eleven scripted episodes of a serialized drama written for vertical, phone-first viewing. Episode count and running times are subject to the final production schedule.

**Standing lines in the flow**

> Not confirmed yet. Your time is held only once you pick it.

> This questionnaire is not a subscription agreement and commits you to nothing.

> Thank you. This offering is limited by law to accredited investors, so we can’t share more here.

**Tax wording**

> none — the tax section is off until a CPA or tax counsel signs the exact wording (gate G_TAX).


## 7. Consent texts (stored verbatim with each consent)

**sms** — (not shown; SMS is off) 

> Yes, text me about this offering at the number above. Message and data rates may apply. Message frequency varies. Reply STOP to opt out at any time and HELP for help. Consent is not a condition of any purchase. See our SMS Terms and Privacy Policy.

**analytics** — 

> Allow analytics cookies so we can see which of our advertisements lead to conversations. We never share what you tell us in the questionnaire.

**followList** — 

> Email me if this offering, or a future one, becomes open to non-accredited investors. One address, no marketing, unsubscribe in one click.


## 8. Questions for securities counsel (HANDOFF.md Appendix C)

1. Exemption, issuer entity, and state of formation.
1. Accredited-verification method for the chosen minimum, and the third-party verifier.
1. Form D timing relative to the first ad and first sale; state notice filings.
1. Whether any person taking investor calls needs to be mindful of broker-dealer registration issues, and the script boundaries for those calls.
1. Whether a public raise affects the pending introductions or the reserved-rights position.
1. Approved wording for the accredited definition, verification sentence, risk sentence, and any return or tax language.
1. Bad-actor questionnaire for covered persons.
1. Record retention period for leads and consents.

## 9. The pages, as staged (plain text)

### /invest/

Staging — not an offering · build d7714d4d0fa4 · 7 of 7 launch gates unsigned.

TRU MEN Productions.

Accredited investors only.

Private offering.

Own a piece of the record.

CLEARLY ESTABLISHED is an eleven-episode first block of a vertical drama series, drawn from State v. Martin, the case in which a unanimous South Carolina Supreme Court reversed a wrongful conviction on March 27, 2000.

The man it happened to is writing and producing it.

[[PENDING: shoot window]], South Carolina.

See if you qualify → How this offering works →.

Accredited investors only.

Not an offer of securities.

§ CLEARLY ESTABLISHED A true story from the public record TRU MEN.

Minimum investment.

[[PENDING: minimum investment — interacts with the verification method]] . 1.

Investor-first payback.

[[PENDING: waterfall — investor-first recoupment % and the profit split after it]] . 2.

Total raise.

[[PENDING: total raise]] . 3.

Production.

Vertical series · Episodes 1–11. 4.

Minimum subscription per investor.

The issuer may accept a smaller amount at its sole discretion.

Terms are set out in full in the offering documents.

Describes the order of distributions after expenses and reserves, as set out in the operating agreement of the issuer.

Distributions are not assured; there may be none.

The maximum amount the issuer intends to accept.

The offering may close below this amount, and the production budget would be adjusted accordingly.

Eleven scripted episodes of a serialized drama written for vertical, phone-first viewing.

Episode count and running times are subject to the final production schedule.

The story.

The case.

In 1996, a twenty-six-year-old Cadillac salesman was arrested in South Carolina.

In 1997 he was convicted.

He served three years and eleven months before a unanimous South Carolina Supreme Court reversed the conviction on March 27, 2000.

Then the opinion that freed him was withdrawn and refiled seventy-seven days later, on June 12, 2000, with language removed — while the State held him ninety-three days past the Court’s order, until the remittitur of June 28, 2000. 1996 Arrested, at twenty-six. 1997 Convicted.

March 27, 2000 Reversed — unanimously.

Op. No. 25093.

June 12, 2000 Opinion withdrawn and refiled, language deleted.

June 28, 2000 Remittitur — ninety-three days after the order that freed him.

Why this travels.

A true story with a public record.

Opinion No. 25093 is on file.

The story stands on documents anyone can read.

Built for the phone first.

Written for vertical viewing, where serialized drama is finding its audience.

Written by the people who lived it.

Michael Anthony Martin and David Alexander Martin.

How it works.

Why investors participate.

Head, wallet, heart — in that order. 01 · Structure.

First-position payback.

[[PENDING: waterfall — investor-first recoupment % and the profit split after it]] . 2. 02 · The work.

Material that exists.

A completed memoir manuscript.

A locked feature screenplay.

Episodes 1–11 of the series, scripted.

Rights held by Revelatory Productions, LLC under a written agreement. 03 · The experience.

Inside the production.

Executive Producer credit · Set visit · Premiere · Festival run · Dinner with the authors · Insider updates.

The perks in full.

Describes the order of distributions after expenses and reserves, as set out in the operating agreement of the issuer.

Distributions are not assured; there may be none.

Start here.

See if you qualify, then pick a time.

Six short steps.

The last two book 30 minutes with the producer.

Step 1 of 6 · About 30 seconds.

Are you an accredited investor?

Yes.

No, or I’m not sure.

What counts as accredited?

Income over $200,000 in each of the last two years ($300,000 with a spouse or partner), with the same expected this year; or.

Net worth over $1,000,000, alone or with a spouse or partner, not counting your primary residence; or.

Certain professional licences in good standing (Series 7, 65 or 82), or an entity that meets its own tests.

These are the general tests.

The full definition is in Rule 501(a) of Regulation D; your status is verified before any subscription is accepted.

Your name.

Email.

Phone.

Leave this field empty.

Without JavaScript we can’t show the calendar here.

Send your details and we will reply by email within one business day with times to choose from.

Send my details →.

Not confirmed yet.

Your time is held only once you pick it.

This questionnaire is not a subscription agreement and commits you to nothing.

The people.

Written by the people who lived it.

Michael Anthony Martin.

Writer · Producer · Subject.

Arrested in 1996 at twenty-six; convicted in 1997; conviction reversed unanimously by the South Carolina Supreme Court on March 27, 2000.

Co-author of the memoir and the screenplay; the series is drawn from both.

Vice-President, Revelatory Productions, LLC.

David Alexander Martin.

Writer · President, Revelatory Productions, LLC.

Co-author of the memoir, the screenplay, and Episodes 1–11.

Kept the visits, the files and the record through the years his brother was held.

President, Revelatory Productions, LLC — a fifty-fifty company, one name on the chain of title.

Still reading? The fastest way through is 30 minutes with the producer.

See if you qualify →.

The plan.

The record is the campaign.

A true story with a paper trail markets itself differently.

The documents are the content.

Primary sources as content.

The filed opinions and the trial record, presented on screen — the kind of material that gets shared because it can be checked.

South Carolina premiere.

A hometown premiere event for cast, investors and press, in the state where the story happened.

Owned audience.

An email list built at release and converted with tickets and editions — a direct line that no platform can switch off.

Perks.

What investors are part of.

Executive Producer credit.

An on-screen credit on the production, in the form the distributor’s credit rules allow.

[[PENDING: perk level — owner]].

Set visit.

A day on set in South Carolina during principal photography, with the producers.

[[PENDING: perk level — owner]].

Premiere.

Two seats at the South Carolina premiere and the reception that follows.

[[PENDING: perk level — owner]].

Festival run.

Invitations to festival screenings as the production travels.

[[PENDING: perk level — owner]].

Dinner with the authors.

A private dinner with Michael and David Martin — the people who lived the story and wrote it.

[[PENDING: perk level — owner]].

Insider updates.

Production updates, dailies where permitted, and first word on release.

[[PENDING: perk level — owner]].

Perks vary by investment level.

Details on your call.

Where the money goes.

Use of funds.

[[PENDING: use-of-funds allocation — must sum to 100%]].

Allocations are approximate and subject to the final budget.

Seen enough?

See if you qualify →.

Questions.

Asked, answered.

What is being offered?

Membership interests in [[PENDING: issuer legal name and state of formation — securities counsel]], a single-purpose company formed to produce Clearly Established.

What is the minimum?

[[PENDING: minimum investment — interacts with the verification method]].

How are investors paid back?

[[PENDING: waterfall — investor-first recoupment % and the profit split after it]].

Who owns the underlying rights?

Revelatory Productions, LLC.

The production company holds the rights it needs for this production under a written agreement.

What are the risks?

This is a high-risk investment.

You could lose some or all of your money.

Most independent productions do not return their budgets.

Full risk factors are in the offering documents.

How is accredited status verified?

[[PENDING: accredited-verification method and the third-party verifier — securities counsel]].

Questions answered? Let’s talk. 30 minutes with the producer.

Pick your time.

See if you qualify →.

No commitment.

No pressure.

Just answers.

The offering structure.

[[PENDING: exemption — securities counsel (page copy assumes Rule 506(c))]] [[PENDING: whether subscription funds are escrowed]] [[PENDING: whether a third-party collection account is used]].

Not an offer.

This page is for information only.

It is not an offer to sell or a solicitation of an offer to buy any security.

Offers are made only through definitive offering documents, and only to investors whose accredited status has been verified.

Any targets, estimates or projections are the issuer’s own, rest on assumptions that may prove wrong, and are not a promise of performance.

Nothing here is a guarantee of any outcome.

Investing in a film or television production is speculative and involves a high degree of risk, including the loss of your entire investment.

Most independent productions do not return their budgets.

Tax outcomes vary by investor and by jurisdiction.

The story.

Based on the public record of State v. Martin, Op. No. 25093 (S.C. 2000), and the recollections of the authors.

TRU MEN Productions Viri Veri . © 2026 Revelatory Productions, LLC. 4607 Charlotte Hwy, Suite 7, Lake Wylie, SC 29710. michaelmartin@greenplanit.org.

Privacy.

See if you qualify → .

### /invest/confirmed/

Staging — not an offering · build d7714d4d0fa4 · 7 of 7 launch gates unsigned.

TRU MEN Productions.

Accredited investors only.

Confirmed.

Your time is booked.

Loading your booking…. 30 minutes with the producer.

Add to your calendar →.

The booking details and calendar file need JavaScript to display here.

They are also in the confirmation email we have just sent you.

What to have ready.

Any questions about the production, the terms or the timeline.

A sense of the range you are considering — nothing is decided on the call.

Nothing to sign and nothing to bring.

Verification, if you proceed, happens afterwards through a third party.

Need to change the time? Reply to the confirmation email, or write to michaelmartin@greenplanit.org.

Accredited investors only.

Not an offer of securities.

This page is for information only.

It is not an offer to sell or a solicitation of an offer to buy any security.

Offers are made only through definitive offering documents, and only to investors whose accredited status has been verified.

Not an offer.

This page is for information only.

It is not an offer to sell or a solicitation of an offer to buy any security.

Offers are made only through definitive offering documents, and only to investors whose accredited status has been verified.

Any targets, estimates or projections are the issuer’s own, rest on assumptions that may prove wrong, and are not a promise of performance.

Nothing here is a guarantee of any outcome.

Investing in a film or television production is speculative and involves a high degree of risk, including the loss of your entire investment.

Most independent productions do not return their budgets.

Tax outcomes vary by investor and by jurisdiction.

The story.

Based on the public record of State v. Martin, Op. No. 25093 (S.C. 2000), and the recollections of the authors.

TRU MEN Productions Viri Veri . © 2026 Revelatory Productions, LLC. 4607 Charlotte Hwy, Suite 7, Lake Wylie, SC 29710. michaelmartin@greenplanit.org.

Privacy.

### /invest/received/

Staging — not an offering · build d7714d4d0fa4 · 7 of 7 launch gates unsigned.

TRU MEN Productions.

Accredited investors only.

Received.

We have your details.

We will reply by email within one business day with times to choose from for a 30-minute call with the producer.

If you would rather not wait, write to michaelmartin@greenplanit.org.

Accredited investors only.

Not an offer of securities.

This page is for information only.

It is not an offer to sell or a solicitation of an offer to buy any security.

Offers are made only through definitive offering documents, and only to investors whose accredited status has been verified.

This questionnaire is not a subscription agreement and commits you to nothing.

Not an offer.

This page is for information only.

It is not an offer to sell or a solicitation of an offer to buy any security.

Offers are made only through definitive offering documents, and only to investors whose accredited status has been verified.

Any targets, estimates or projections are the issuer’s own, rest on assumptions that may prove wrong, and are not a promise of performance.

Nothing here is a guarantee of any outcome.

Investing in a film or television production is speculative and involves a high degree of risk, including the loss of your entire investment.

Most independent productions do not return their budgets.

Tax outcomes vary by investor and by jurisdiction.

The story.

Based on the public record of State v. Martin, Op. No. 25093 (S.C. 2000), and the recollections of the authors.

TRU MEN Productions Viri Veri . © 2026 Revelatory Productions, LLC. 4607 Charlotte Hwy, Suite 7, Lake Wylie, SC 29710. michaelmartin@greenplanit.org.

Privacy.

### /invest/not-accredited/

Staging — not an offering · build d7714d4d0fa4 · 7 of 7 launch gates unsigned.

TRU MEN Productions.

Accredited investors only.

Thank you.

Thank you.

This offering is limited by law to accredited investors, so we can’t share more here.

Accredited investors only.

Not an offer of securities.

This page is for information only.

It is not an offer to sell or a solicitation of an offer to buy any security.

Offers are made only through definitive offering documents, and only to investors whose accredited status has been verified.

Not an offer.

This page is for information only.

It is not an offer to sell or a solicitation of an offer to buy any security.

Offers are made only through definitive offering documents, and only to investors whose accredited status has been verified.

Any targets, estimates or projections are the issuer’s own, rest on assumptions that may prove wrong, and are not a promise of performance.

Nothing here is a guarantee of any outcome.

Investing in a film or television production is speculative and involves a high degree of risk, including the loss of your entire investment.

Most independent productions do not return their budgets.

Tax outcomes vary by investor and by jurisdiction.

The story.

Based on the public record of State v. Martin, Op. No. 25093 (S.C. 2000), and the recollections of the authors.

TRU MEN Productions Viri Veri . © 2026 Revelatory Productions, LLC. 4607 Charlotte Hwy, Suite 7, Lake Wylie, SC 29710. michaelmartin@greenplanit.org.

Privacy.

### /privacy/

Staging — not an offering · build d7714d4d0fa4 · 7 of 7 launch gates unsigned.

TRU MEN Productions.

Accredited investors only.

Privacy.

Privacy policy.

Applies to the investor page at /invest and its forms.

Draft for counsel review.

What we collect.

When you complete the questionnaire we store: your name, email address and phone number; your answers to the questions about accredited status, the range you are considering and what matters most to you; the timezone you chose; the time you booked; and, if you gave it, your consent to text messages, together with the exact words you agreed to.

We also record how you reached the page — the advertising parameters in the link you clicked (such as utm_source and utm_campaign ), the page you landed on and the site that referred you — a one-way hash of your IP address (not the address itself), your browser’s user-agent string, and the version of this page you saw.

We do not collect, and the questionnaire never asks for, your Social Security number, financial statements or any verification documents.

If you proceed, accredited-investor verification is carried out separately by a third party, and none of it passes through this website.

Why.

To hold the call you booked and to send you its details.

To let the person taking the call prepare — your three answers are shown to them beforehand.

To know which advertisement led to a conversation, so we spend less on the ones that don’t.

To keep a record of what you were shown and what you agreed to, which the law governing private offerings requires of us.

Who else sees it.

The service providers that run this page, each only for its own job:.

Cloudflare hosts the page, runs the form handlers, stores the database, and screens the form for automated abuse (Turnstile).

Cal.com provides the calendar availability and creates the booking on the host’s calendar.

Resend sends the confirmation email to you and the notification to us.

We do not sell your information, and we do not share it with anyone else except as the law requires.

Cookies and storage.

The page sets no advertising or analytics cookies by default.

Your progress through the questionnaire and the link parameters are kept in your browser’s session storage and are gone when you close the tab.

How long we keep it.

[[PENDING: record retention period for leads and consents — counsel]].

Your choices.

Write to michaelmartin@greenplanit.org to see what we hold about you, to correct it, or to have it deleted.

We will confirm within thirty days.

If you opted in to text messages, reply STOP to any message to end them.

Who we are.

Revelatory Productions, LLC, 4607 Charlotte Hwy, Suite 7, Lake Wylie, SC 29710.

Not an offer.

This page is for information only.

It is not an offer to sell or a solicitation of an offer to buy any security.

Offers are made only through definitive offering documents, and only to investors whose accredited status has been verified.

Any targets, estimates or projections are the issuer’s own, rest on assumptions that may prove wrong, and are not a promise of performance.

Nothing here is a guarantee of any outcome.

Investing in a film or television production is speculative and involves a high degree of risk, including the loss of your entire investment.

Most independent productions do not return their budgets.

Tax outcomes vary by investor and by jurisdiction.

The story.

Based on the public record of State v. Martin, Op. No. 25093 (S.C. 2000), and the recollections of the authors.

TRU MEN Productions Viri Veri . © 2026 Revelatory Productions, LLC. 4607 Charlotte Hwy, Suite 7, Lake Wylie, SC 29710. michaelmartin@greenplanit.org.

Privacy.

### /terms/

Staging — not an offering · build d7714d4d0fa4 · 7 of 7 launch gates unsigned.

TRU MEN Productions.

Accredited investors only.

SMS Terms.

Text message terms.

Applies to text messages about the CLEARLY ESTABLISHED private offering.

Draft for counsel review.

The program.

By checking the box on the questionnaire you agree to receive text messages from Revelatory Productions, LLC about this offering — the call you booked, a reminder before it, and a reply if you text us.

Consent is not a condition of any purchase or investment.

The words you agreed to were: Yes, text me about this offering at the number above.

Message and data rates may apply.

Message frequency varies.

Reply STOP to opt out at any time and HELP for help.

Consent is not a condition of any purchase.

See our SMS Terms and Privacy Policy.

Frequency and cost.

Message frequency varies and is low — expect a handful of messages around your call.

Message and data rates may apply according to your mobile plan.

Stopping and help.

Reply STOP to any message to opt out.

You will receive one confirmation and nothing further.

Reply HELP for help, or write to michaelmartin@greenplanit.org.

Carriers.

Carriers are not liable for delayed or undelivered messages.

Privacy.

Your number is used only for this program and is handled as described in our privacy policy.

Accredited investors only.

Not an offer of securities.

Not an offer.

This page is for information only.

It is not an offer to sell or a solicitation of an offer to buy any security.

Offers are made only through definitive offering documents, and only to investors whose accredited status has been verified.

Any targets, estimates or projections are the issuer’s own, rest on assumptions that may prove wrong, and are not a promise of performance.

Nothing here is a guarantee of any outcome.

Investing in a film or television production is speculative and involves a high degree of risk, including the loss of your entire investment.

Most independent productions do not return their budgets.

Tax outcomes vary by investor and by jurisdiction.

The story.

Based on the public record of State v. Martin, Op. No. 25093 (S.C. 2000), and the recollections of the authors.

TRU MEN Productions Viri Veri . © 2026 Revelatory Productions, LLC. 4607 Charlotte Hwy, Suite 7, Lake Wylie, SC 29710. michaelmartin@greenplanit.org.

Privacy.


## 10. What the system stores

Per lead: name, email, phone (E.164), self-reported accredited status, amount range, interest, timezone, status, UTM parameters and click id, landing path, referrer, a salted hash of the IP address (never the address), user agent, the git SHA of the page build seen, the channel (flow or plain form). Per consent: kind, granted, the exact text shown and its SHA-256, timestamp. Per booking: provider, provider reference, start, end, status. Per event: name, properties, session id. Schema: `db/migrations/0001_init.sql`.

Never stored: Social Security numbers, financial documents, verification files. Verification happens with the third party counsel selects.


---

VIRI VERI


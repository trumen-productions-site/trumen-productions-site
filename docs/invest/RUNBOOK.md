# Runbook — the investor page

How to run it, stage it, launch it, keep it running, and shut parts of it off. Written so a new engineer can deploy
staging from this file alone.

## 1. Run it locally

Node 22.13 or newer. Nothing to install for the page itself.

```bash
npm run dev:invest        # build, then serve at http://localhost:8788/invest/
```

That is `tools/dev-api.mjs`: the built site plus the Pages Functions, backed by a SQLite file in `.data/` through a
D1-shaped shim, the **mock scheduler** (weekday mornings and afternoons, Eastern time), **mock Turnstile** (any token
passes) and **logged mail** (printed, not sent). The whole six-step flow works with no account anywhere.

Copy `.dev.vars.example` to `.dev.vars` to change any of it — point `SCHEDULER=calcom` at a real Cal.com event
type, set `RESEND_API_KEY` to send real mail, and so on.

The vendor's own local runner also works, against a local D1:

```bash
npx wrangler d1 migrations apply ce_invest --local
npx wrangler pages dev dist --d1 DB=ce_invest
```

## 2. Test it

```bash
npm test               # company site + investor page: 690 assertions, builds first
npm run test:invest    # the investor page alone (config, gates, footnotes, lints, machine, validators, UTM, API, headers, page)
npm run test:e2e       # browser suite: E2E-01…05, A11Y-01/02, SNAP-01 (needs: npm install --no-save playwright-core axe-core)
npm run perf           # PERF-01 Lighthouse budgets (needs: npm install --no-save lighthouse)
npm run check:gates    # the launch gates, who signs, what is blocking
npm run check:pending  # every undecided term, in config and on the built pages
npm run check:forbidden
npm run check:sources  # SRC-01, needs network
npm run counsel:packet # regenerates docs/invest/COUNSEL_REVIEW.md from the build
npm run demo           # invest-demo/: the pages with an in-page mock API, for showing the flow anywhere
```

CI (`.github/workflows/pages.yml`) runs all of it on every push. The screenshots and Lighthouse report are kept as
the `invest-e2e-output` artefact.

## 3. Staging

A Cloudflare Pages project, `trumen-invest`, with the `staging` branch behind **Cloudflare Access** (Zero Trust →
Access → Applications → self-hosted, the staging hostname, an allow policy on an email list). Nobody outside the list
reaches it; the page additionally carries `noindex, nofollow`, an `X-Robots-Tag`, and the red ribbon.

Once, from a machine with the Cloudflare account:

```bash
npx wrangler login
npx wrangler d1 create ce_invest                  # paste database_id into wrangler.toml
npx wrangler d1 migrations apply ce_invest --remote
npx wrangler pages project create trumen-invest --production-branch production
# secrets — never in a file, never in the repository
for s in TURNSTILE_SECRET RESEND_API_KEY CALCOM_API_KEY IP_SALT CRON_SECRET; do npx wrangler pages secret put $s --project-name trumen-invest; done
```

Then every push to `main` deploys staging through `.github/workflows/invest-deploy.yml`, if the repository secrets
`CLOUDFLARE_API_TOKEN` (Pages:Edit, D1:Edit) and `CLOUDFLARE_ACCOUNT_ID` are set. Without them the workflow builds
and tests and deploys nothing. Manually: `npm run build && npx wrangler pages deploy dist --project-name trumen-invest --branch staging`.

Staging variables (`wrangler.toml → [vars]`) use the mock scheduler and mock Turnstile so the flow can be walked
end to end on the staging URL. Switch `SCHEDULER` to `calcom` on staging once Phase 4 begins (§ 7).

## 4. Production — the launch (Phase 6)

Blocked until every gate is signed. The sequence:

1. Decide every pending term in `src/invest/config/` (`npm run check:pending` lists them) and set the real Turnstile
   site key in `config/site.mjs`.
2. Sign the gates in `src/invest/config/gates.json` — each by the person named in `COMPLIANCE.md`, on the date they
   signed. `npm run check:gates` must pass.
3. `npm run build:prod` locally. It refuses with a list if anything is wrong, and leaves no output behind.
4. In the Pages project's **production** environment set: `SCHEDULER=calcom`, `CALCOM_EVENT_TYPE_ID`,
   `SITE_URL=https://<domain>`, `MAIL_FROM` on a verified Resend domain, `HOST_*`, `PRODUCER_EMAIL`,
   `CONTACT_EMAIL`; **unset** `TURNSTILE_MODE` (live verification). Confirm all five secrets are present.
5. Run the GitHub Action *Investor page — deploy* with `target: production`. It re-runs the gates, the suite,
   `build:prod`, the pending and forbidden checks and the source check, then deploys to the `production` branch.
6. Live booking test: an ad URL with the real UTMs → six steps → a booking on the host's calendar → the confirmation
   email with its `.ics` → `npm run leads:export` shows the lead with its attribution.
7. Remove the Access policy from production (keep it on staging). Confirm `/api/health` answers `ok: true`.

**Rollback:** Cloudflare Pages → the project → Deployments → the previous production deployment → *Rollback*.
Functions and static files roll back together; the database does not need to.

## 5. Keys and secrets

| Secret | Used by | Rotate by |
|---|---|---|
| `TURNSTILE_SECRET` | `/api/lead` | Cloudflare dashboard → Turnstile → the widget → rotate; `wrangler pages secret put` |
| `RESEND_API_KEY` | all mail | Resend → API keys → create new, put, then delete the old |
| `CALCOM_API_KEY` | slots and bookings | Cal.com → Settings → Developer → API keys |
| `IP_SALT` | hashing addresses | Any long random string. Rotating it changes every future hash; rate-limit windows reset, old leads keep their old hashes. |
| `CRON_SECRET` | `/api/cron/abandoned` | Any long random string; update the scheduler that calls the endpoint |
| `META_CAPI_TOKEN` | Conversions API, only if `features.metaPixel` | Meta Events Manager |

`.dev.vars` is gitignored; `.dev.vars.example` is the only file with these names in it. `npm test` scans the build
for anything key-shaped (SEC-01).

## 6. Scheduling the abandonment sweep

A lead who saves their details and books nothing within 30 minutes earns the producer one *Lead without booking*
notice. Call `GET /api/cron/abandoned` with `Authorization: Bearer <CRON_SECRET>` every 15 minutes from:

- a Cloudflare Worker with a cron trigger (`*/15 * * * *`) that fetches the URL — the smallest option on the same
  account; or
- any external cron (GitHub Actions `schedule:`, cron-job.org, a server you already have).

The endpoint is idempotent: a lead is notified once, and a booked lead never.

## 7. Turning on Cal.com

Create an event type (30 minutes, the host's availability, buffer as wanted). Note its id. Set
`SCHEDULER=calcom`, `CALCOM_EVENT_TYPE_ID`, and the `CALCOM_API_KEY` secret. The adapter is in
`functions/api/_lib/scheduler.js` and was written without access to the current API docs (D-07): **verify the
endpoints, headers and payload shapes against the Cal.com v2 documentation before the first staging booking**, then
make a real test booking from staging and confirm it lands on the host's calendar. `/api/health` reports
`scheduler: true` when the adapter can reach the API.

## 8. Export leads

```bash
# production
npx wrangler d1 execute ce_invest --remote --json --command "$(node scripts/export-leads.mjs --sql)" | node scripts/export-leads.mjs > leads.csv
# local
node scripts/export-leads.mjs --db .data/invest.sqlite > leads.csv
```

One row per lead with its booking and a summary of its consents. The export is personal data: keep it in the
place counsel designates, and delete it when done.

## 9. The funnel, by ad creative

Booked calls, not clicks. Run against D1 with `wrangler d1 execute ce_invest --remote --command "…"`:

```sql
-- Leads and bookings per ad creative
SELECT l.utm_content AS creative,
       COUNT(*)                                                     AS leads,
       SUM(CASE WHEN l.status = 'booked' THEN 1 ELSE 0 END)         AS booked,
       ROUND(100.0 * SUM(CASE WHEN l.status = 'booked' THEN 1 ELSE 0 END) / COUNT(*), 1) AS booked_pct
FROM leads l
WHERE l.accredited_self_report = 'yes'
GROUP BY l.utm_content
ORDER BY booked DESC, leads DESC;

-- Where sessions stop (events per step, last 30 days)
SELECT name, json_extract(props, '$.step') AS step, COUNT(DISTINCT session_id) AS sessions
FROM events
WHERE created_at >= datetime('now', '-30 days')
GROUP BY name, step
ORDER BY sessions DESC;

-- Not-accredited answers per creative (anonymous: no lead row exists)
SELECT json_extract(props, '$.channel') AS channel, COUNT(*) FROM events WHERE name = 'not_accredited_end' GROUP BY channel;
```

## 10. A deletion request

Write to the address on the privacy page; confirm within thirty days. Then, with the lead's email:

```sql
DELETE FROM consents WHERE lead_id IN (SELECT id FROM leads WHERE email = ?);
UPDATE bookings SET status = 'cancelled' WHERE lead_id IN (SELECT id FROM leads WHERE email = ?);
DELETE FROM events   WHERE lead_id IN (SELECT id FROM leads WHERE email = ?);
DELETE FROM leads    WHERE email = ?;
```

Cancel the calendar booking in Cal.com as well, and delete the lead's rows from any CSV export. Keep a note of the
request and the date it was honoured (counsel's retention rule applies to that note, not to the data).

**Retention:** `legal.retention` in `config/legal.mjs` is pending counsel's decision (HANDOFF.md Appendix C.8). When
it is set, schedule a monthly `DELETE … WHERE created_at < datetime('now', '-<period>')` on `leads`, `consents`,
`events` and `follow_list`, and say so on the privacy page (it reads the same value).

## 11. Turning features on

Each flag in `src/invest/config/features.mjs` has a gate in `COMPLIANCE.md`. Flip the flag, set the matching runtime
variable where there is one (`FEATURE_SMS`, `FEATURE_FOLLOW_LIST`), rebuild, run `npm test`, redeploy. The build
refuses `taxSection` without `legal.tax`, and `comps` without three verified comparables.

## 12. When the scheduler is down

`/api/health` returns 503 with `scheduler: false`. The island shows "No open times this month" rather than an error;
leads are still saved at step 4 and the producer still gets the *New investor lead* mail, so nobody is lost. To
degrade deliberately, set `SCHEDULER=mock` on production for the duration — the mock books nothing on a real
calendar, so follow each booking by hand from the producer's *Booked* notice — and switch back once Cal.com answers.

## 13. Hosts and limits in one place

| | Where |
|---|---|
| Static pages, Functions, headers | Cloudflare Pages project `trumen-invest` (`wrangler.toml`) |
| Database | D1 `ce_invest`; schema `db/migrations/0001_init.sql` |
| Rate limits | `/api/lead` 10 / 10 min per address (plain form 3 / hour); `/api/slots` 60 / 10 min; `/api/book` 20 / 10 min; `/api/event` 240 / 10 min; `/api/follow` 5 / hour |
| Booking window | lead time 4 h (`BOOKING_LEAD_TIME_HOURS`), horizon 60 days (`BOOKING_HORIZON_DAYS`), 30 minutes (`BOOKING_DURATION_MINUTES`) |
| Mail | Resend; from `MAIL_FROM`; producer notices to `PRODUCER_EMAIL` |
| Bot screening | Turnstile on step 4; honeypot on the plain form |

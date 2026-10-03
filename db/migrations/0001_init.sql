-- CLEARLY ESTABLISHED investor page — D1 schema (HANDOFF.md § 11.1).
--
-- Apply locally:   npx wrangler d1 migrations apply ce_invest --local
-- Apply remotely:  npx wrangler d1 migrations apply ce_invest --remote
--
-- `page_version` is the git SHA of the deployed build, so there is a record
-- of exactly which copy and disclaimers each investor saw. `consents.text_shown`
-- stores the exact words displayed. IP addresses are stored only as a salted hash.

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  accredited_self_report TEXT NOT NULL CHECK (accredited_self_report IN ('yes', 'no_or_unsure')),
  amount_range TEXT,
  interest TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  timezone TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'booked', 'held', 'verified', 'declined')),
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT, utm_id TEXT,
  fbclid TEXT,
  landing_path TEXT,
  referrer TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  page_version TEXT NOT NULL,
  -- 'flow' for the six-step island, 'nojs' for the plain form fallback
  channel TEXT NOT NULL DEFAULT 'flow',
  -- set when the "lead without booking" notice has gone to the producer
  abandon_notified_at TEXT
);

CREATE INDEX IF NOT EXISTS leads_created_at ON leads (created_at);
CREATE INDEX IF NOT EXISTS leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS leads_utm_content ON leads (utm_content);

CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  kind TEXT NOT NULL CHECK (kind IN ('sms', 'analytics', 'follow_list')),
  granted INTEGER NOT NULL,
  text_shown TEXT NOT NULL,
  text_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS consents_lead_id ON consents (lead_id);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  provider TEXT NOT NULL,
  provider_ref TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
  created_at TEXT NOT NULL
);

-- One confirmed booking per start time: the database refuses the double
-- booking even if two requests race past the application check (API-03).
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_per_slot ON bookings (starts_at) WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS bookings_lead_id ON bookings (lead_id);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  props TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS events_name_created ON events (name, created_at);
CREATE INDEX IF NOT EXISTS events_session ON events (session_id);

-- Fixed-window rate limiting, keyed by route and hashed IP.
CREATE TABLE IF NOT EXISTS ratelimit (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);

-- The optional "tell me if this opens up" list from the not-accredited end
-- screen. Empty unless features.followList is on.
CREATE TABLE IF NOT EXISTS follow_list (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  text_shown TEXT NOT NULL,
  text_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  ip_hash TEXT
);

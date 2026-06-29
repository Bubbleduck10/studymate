-- StudyMate datastore (Cloudflare D1 / SQLite) — full schema for a fresh database.
-- Apply with:  wrangler d1 execute studymate --file=./schema.sql           (local)
--              wrangler d1 execute studymate --remote --file=./schema.sql  (deployed)
-- Already created the DB before accounts/Stripe? Run migrate-v2.sql instead.

CREATE TABLE IF NOT EXISTS accounts (
  id                  TEXT PRIMARY KEY,           -- principal: "user:<id>" or "anon:<clientId>"
  credits             INTEGER NOT NULL,
  tier                TEXT    NOT NULL DEFAULT 'free',
  period              TEXT    NOT NULL,           -- "YYYY-MM" of the current free-credit period
  stripe_customer_id  TEXT,
  created_at          TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS spend_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id  TEXT    NOT NULL,
  cost        INTEGER NOT NULL,
  model       TEXT    NOT NULL,
  created_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_spend_account ON spend_log(account_id);

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_codes (
  email       TEXT PRIMARY KEY,
  code_hash   TEXT    NOT NULL,
  expires_at  INTEGER NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket        TEXT PRIMARY KEY,
  window_start  INTEGER NOT NULL,
  count         INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS decks (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL,
  title       TEXT NOT NULL,
  data_json   TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_decks_account ON decks(account_id);

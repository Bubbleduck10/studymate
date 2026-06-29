-- Run this ONLY if you created the DB before accounts/Stripe were added
-- (i.e. you already ran the earlier schema.sql with just accounts + spend_log).
-- Fresh databases: use schema.sql instead.
--   wrangler d1 execute studymate --file=./migrate-v2.sql           (local)
--   wrangler d1 execute studymate --remote --file=./migrate-v2.sql  (deployed)

ALTER TABLE accounts ADD COLUMN stripe_customer_id TEXT;

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

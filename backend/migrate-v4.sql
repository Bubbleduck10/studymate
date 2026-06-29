-- Run this if your DB predates saved decks (idempotent — safe to run anytime).
--   wrangler d1 execute studymate --file=./migrate-v4.sql           (local)
--   wrangler d1 execute studymate --remote --file=./migrate-v4.sql  (deployed)

CREATE TABLE IF NOT EXISTS decks (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL,
  title       TEXT NOT NULL,
  data_json   TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_decks_account ON decks(account_id);

-- Run this if your DB predates rate limiting (idempotent — safe to run anytime).
--   wrangler d1 execute studymate --file=./migrate-v3.sql           (local)
--   wrangler d1 execute studymate --remote --file=./migrate-v3.sql  (deployed)

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket        TEXT PRIMARY KEY,
  window_start  INTEGER NOT NULL,
  count         INTEGER NOT NULL
);

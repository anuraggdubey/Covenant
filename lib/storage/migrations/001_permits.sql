-- Covenant permit persistence.
--
-- Run against a Neon Postgres branch:  npm run db:migrate
-- or paste into the Neon SQL editor. Safe to run more than once.
--
-- Without this, Covenant still works: the permit console falls back to an
-- in-memory store so a fresh clone can sign and expire a permit with no
-- setup at all. What the database adds is permits that survive a restart.

CREATE TABLE IF NOT EXISTS permit_drafts (
  draft_id      TEXT PRIMARY KEY,
  status        TEXT        NOT NULL,
  symbol        TEXT        NOT NULL,
  intent        JSONB       NOT NULL,
  policy        JSONB       NOT NULL,
  material_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS permits (
  permit_id        TEXT PRIMARY KEY,
  -- UNIQUE is the single-use guarantee at the storage layer. Even if two
  -- requests race, the database refuses the second permit for a nonce.
  nonce            TEXT        NOT NULL UNIQUE,
  status           TEXT        NOT NULL,
  execution        TEXT        NOT NULL,
  symbol           TEXT        NOT NULL,
  permit           JSONB       NOT NULL,
  intent           JSONB       NOT NULL,
  policy           JSONB       NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL,
  expires_at       TIMESTAMPTZ NOT NULL,
  used_at          TIMESTAMPTZ,
  order_id         TEXT,
  request_id       TEXT,
  rejection_code   TEXT,
  rejection_reason TEXT
);

-- The console lists newest-first and filters by lifecycle.
CREATE INDEX IF NOT EXISTS permits_created_at_idx ON permits (created_at DESC);
CREATE INDEX IF NOT EXISTS permits_expires_at_idx ON permits (expires_at);

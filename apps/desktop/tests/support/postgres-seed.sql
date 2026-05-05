DROP SCHEMA IF EXISTS app CASCADE;
CREATE SCHEMA app;

-- Extensions are best-effort: PGlite supports pgvector via the opt-in
-- `@electric-sql/pglite/vector` bundle but not PostGIS; real-Postgres CI
-- images may or may not have either. We gate each CREATE EXTENSION on
-- pg_available_extensions so the rest of the seed still runs when an
-- extension is missing. We avoid BEGIN..EXCEPTION..END because PGlite's WASM
-- build does not support setjmp/longjmp used by PL/pgSQL exception handlers.
-- Suite files detect capability via hasExtension() and skip extension-specific
-- cases accordingly.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'postgis') THEN
    CREATE EXTENSION IF NOT EXISTS postgis;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    CREATE EXTENSION IF NOT EXISTS vector;
  END IF;
END $$;

-- User-defined enum type: exercises the dynamic enum-label pipeline
-- (buildEnumTypeMap + ColumnInfo.enumLabels/enumPgCast + updateCell enum
-- cast branch). Keep it in the app schema so the integration suite proves
-- schema-qualified enum writes rather than relying on search_path.
CREATE TYPE app.user_role AS ENUM ('admin', 'editor', 'viewer');
CREATE DOMAIN app.email_text AS TEXT
  CHECK (VALUE LIKE '%@%');
CREATE TYPE app.mailing_address AS (
  street TEXT,
  city TEXT,
  postcode TEXT
);

-- Users: broad type coverage, PRIMARY KEY on id.
-- profile_note is nullable + citext-less-text; used for SET NULL tests.
CREATE TABLE app.users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  role app.user_role NOT NULL DEFAULT 'viewer',
  role_history app.user_role[] NOT NULL DEFAULT '{}'::app.user_role[],
  contact_email app.email_text,
  mailing_address app.mailing_address,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  login_count INTEGER NOT NULL DEFAULT 0,
  balance_cents BIGINT NOT NULL DEFAULT 0,
  score NUMERIC(10, 2),
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  profile_note TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  external_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conditional PostGIS column: added only if the extension loaded.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    EXECUTE 'ALTER TABLE app.users ADD COLUMN location geometry(Point, 4326)';
  END IF;
END $$;

-- Conditional pgvector column: added only if the extension loaded.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    EXECUTE 'ALTER TABLE app.users ADD COLUMN embedding vector(3)';
  END IF;
END $$;

CREATE TABLE app.orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES app.users(id),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX orders_user_id_idx ON app.orders (user_id);

-- Composite primary key: exercises multi-column PK resolution and UPDATE WHERE.
CREATE TABLE app.order_items (
  order_id INTEGER NOT NULL REFERENCES app.orders(id),
  line_number INTEGER NOT NULL,
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, line_number)
);

-- No primary key: exercises the "not editable" path.
CREATE TABLE app.notes (
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Column with quote/semicolon in its identifier — exercises quoteIdent.
-- This table is intentionally not fully populated; we only need it to exist
-- so SQL-identifier injection tests can target it.
CREATE TABLE app.injection_target (
  id SERIAL PRIMARY KEY,
  "evil""col; DROP TABLE x; --" TEXT
);

INSERT INTO app.users (
  email, display_name, status, role, is_verified, login_count, balance_cents,
  score, profile, profile_note, tags, external_id
)
SELECT
  'user' || gs || '@example.com',
  'User ' || gs,
  CASE WHEN gs % 7 = 0 THEN 'inactive' ELSE 'active' END,
  (CASE (gs % 3) WHEN 0 THEN 'admin' WHEN 1 THEN 'editor' ELSE 'viewer' END)::app.user_role,
  (gs % 3 = 0),
  gs,
  gs * 1000,
  (gs::numeric / 10),
  jsonb_build_object('rank', gs, 'tags', jsonb_build_array('seed', 'user')),
  CASE WHEN gs % 5 = 0 THEN NULL ELSE 'note ' || gs END,
  ARRAY['seed', 'user-' || gs]::text[],
  ('00000000-0000-0000-0000-' || lpad(gs::text, 12, '0'))::uuid
FROM generate_series(1, 120) AS gs;

INSERT INTO app.orders (user_id, total_cents, metadata)
SELECT
  ((gs - 1) % 120) + 1,
  gs * 100,
  jsonb_build_object('order_number', gs, 'source', 'seed')
FROM generate_series(1, 80) AS gs;

INSERT INTO app.order_items (order_id, line_number, sku, quantity)
SELECT
  ((gs - 1) % 80) + 1,
  ((gs - 1) / 80) + 1,
  'SKU-' || gs,
  (gs % 5) + 1
FROM generate_series(1, 160) AS gs;

INSERT INTO app.notes (body)
SELECT 'Note ' || gs
FROM generate_series(1, 5) AS gs;

INSERT INTO app.injection_target ("evil""col; DROP TABLE x; --")
VALUES ('original'), ('original'), ('original');

CREATE OR REPLACE FUNCTION app.users_updated_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN NEW;
END
$$;

CREATE TRIGGER users_updated_trigger
BEFORE UPDATE ON app.users
FOR EACH ROW
EXECUTE FUNCTION app.users_updated_trigger_fn();

CREATE VIEW app.active_users AS
SELECT id, email, display_name
FROM app.users
WHERE status = 'active';

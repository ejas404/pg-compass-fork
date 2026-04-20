DROP SCHEMA IF EXISTS app CASCADE;
CREATE SCHEMA app;

CREATE TABLE app.users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE app.orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES app.users(id),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX orders_user_id_idx ON app.orders (user_id);

INSERT INTO app.users (email, display_name, status, profile)
SELECT
  'user' || gs || '@example.com',
  'User ' || gs,
  CASE WHEN gs % 7 = 0 THEN 'inactive' ELSE 'active' END,
  jsonb_build_object('rank', gs, 'tags', jsonb_build_array('seed', 'user'))
FROM generate_series(1, 120) AS gs;

INSERT INTO app.orders (user_id, total_cents, metadata)
SELECT
  ((gs - 1) % 120) + 1,
  gs * 100,
  jsonb_build_object('order_number', gs, 'source', 'seed')
FROM generate_series(1, 80) AS gs;

CREATE VIEW app.active_users AS
SELECT id, email, display_name
FROM app.users
WHERE status = 'active';

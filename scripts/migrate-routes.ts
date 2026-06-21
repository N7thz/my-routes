import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});

const sql = `
ALTER TABLE company
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS lat     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng     DOUBLE PRECISION;

DO $$ BEGIN
  CREATE TYPE route_status AS ENUM ('RASCUNHO', 'EM_ANDAMENTO', 'CONCLUIDA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS route (
  id         TEXT         NOT NULL PRIMARY KEY,
  user_id    TEXT         NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name       TEXT         NOT NULL,
  date       DATE,
  status     route_status NOT NULL DEFAULT 'RASCUNHO',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stop (
  id         TEXT        NOT NULL PRIMARY KEY,
  route_id   TEXT        NOT NULL REFERENCES route(id)   ON DELETE CASCADE,
  company_id TEXT                 REFERENCES company(id) ON DELETE SET NULL,
  label      TEXT,
  address    TEXT        NOT NULL,
  lat        DOUBLE PRECISION,
  lng        DOUBLE PRECISION,
  "order"    INTEGER     NOT NULL DEFAULT 0,
  visited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const client = await pool.connect();
try {
  await client.query(sql);
  console.log("Migration aplicada com sucesso.");
} finally {
  client.release();
  await pool.end();
}

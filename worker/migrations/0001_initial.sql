PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  category TEXT,
  group_name TEXT,
  area TEXT,
  portions INTEGER NOT NULL DEFAULT 1,
  delivery_status TEXT NOT NULL DEFAULT 'planned',
  driver_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  label TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  island_city TEXT,
  atoll_region TEXT,
  country TEXT DEFAULT 'Maldives',
  notes TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at INTEGER,
  FOREIGN KEY (record_id) REFERENCES records(id)
);

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  vehicle TEXT,
  area TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  user_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  user_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_records_name ON records(name);
CREATE INDEX IF NOT EXISTS idx_records_phone ON records(phone);
CREATE INDEX IF NOT EXISTS idx_records_updated_at ON records(updated_at);
CREATE INDEX IF NOT EXISTS idx_addresses_record_id ON addresses(record_id);
CREATE INDEX IF NOT EXISTS idx_addresses_updated_at ON addresses(updated_at);
CREATE INDEX IF NOT EXISTS idx_drivers_name ON drivers(name);
CREATE INDEX IF NOT EXISTS idx_drivers_updated_at ON drivers(updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

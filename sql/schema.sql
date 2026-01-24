CREATE TABLE IF NOT EXISTS feeds (
  uuid            TEXT PRIMARY KEY,
  url             TEXT NOT NULL UNIQUE,
  link            TEXT,
  title           TEXT,
  description     TEXT,
  language        TEXT,
  image_url       TEXT,
  copyright       TEXT,
  feed_type       TEXT,
  feed_version    TEXT,
  last_fetched_at TEXT,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
  id           TEXT PRIMARY KEY,
  url          TEXT NOT NULL UNIQUE,
  title        TEXT,
  description  TEXT,
  published_at TEXT,
  author       TEXT,
  guid         TEXT,
  created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feed_items (
  feed_id    TEXT NOT NULL,
  item_id    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (feed_id, item_id),
  FOREIGN KEY (feed_id) REFERENCES feeds(uuid) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS item_reads (
  item_id    TEXT NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0, -- 0: false, 1: true
  read_at    TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS item_saves (
  item_id    TEXT NOT NULL,
  is_saved   INTEGER NOT NULL DEFAULT 0, -- 0: false, 1: true
  saved_at   TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

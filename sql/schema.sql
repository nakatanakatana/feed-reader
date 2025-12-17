CREATE TABLE feeds (
  uuid            TEXT PRIMARY KEY,
  url             TEXT NOT NULL UNIQUE,
  link            TEXT,
  title           TEXT NOT NULL,
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


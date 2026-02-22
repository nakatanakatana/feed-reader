CREATE TABLE feeds (
  id              TEXT PRIMARY KEY,
  url             TEXT NOT NULL UNIQUE,
  link            TEXT,
  title           TEXT,
  description     TEXT,
  lang            TEXT,
  image_url       TEXT,
  copyright       TEXT,
  feed_type       TEXT,
  feed_version    TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now'))
);

CREATE TABLE items (
  id           TEXT PRIMARY KEY,
  url          TEXT NOT NULL UNIQUE,
  title        TEXT,
  description  TEXT,
  published_at TEXT,
  author       TEXT,
  guid         TEXT,
  content      TEXT,
  image_url    TEXT,
  categories   TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now'))
);

CREATE TABLE feed_items (
  feed_id    TEXT NOT NULL,
  item_id    TEXT NOT NULL,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  PRIMARY KEY (feed_id, item_id),
  FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE item_reads (
  item_id    TEXT NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0,
  read_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  PRIMARY KEY (item_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE tags (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now'))
);

CREATE TABLE feed_tags (
  feed_id    TEXT NOT NULL,
  tag_id     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  PRIMARY KEY (feed_id, tag_id),
  FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE feed_fetcher (
  feed_id       TEXT PRIMARY KEY,
  etag          TEXT,
  last_modified TEXT,
  last_fetched_at TEXT,
  next_fetch    TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
);

CREATE INDEX idx_feeds_updated_at ON feeds(updated_at);
CREATE INDEX idx_tags_updated_at ON tags(updated_at);
CREATE INDEX idx_items_created_at ON items(created_at);
CREATE INDEX idx_feed_fetcher_next_fetch ON feed_fetcher(next_fetch);
CREATE INDEX idx_feed_items_feed_id_published_at ON feed_items(feed_id, published_at DESC);

CREATE TABLE url_parsing_rules (
  id          TEXT PRIMARY KEY,
  domain      TEXT NOT NULL,
  rule_type   TEXT NOT NULL,
  pattern     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  UNIQUE(domain, rule_type)
);

CREATE TABLE item_block_rules (
  id          TEXT PRIMARY KEY,
  rule_type   TEXT NOT NULL,
  rule_value  TEXT NOT NULL,
  domain      TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  UNIQUE(rule_type, rule_value, domain)
);

CREATE TABLE item_blocks (
  item_id    TEXT NOT NULL,
  rule_id    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%FT%TZ', 'now')),
  PRIMARY KEY (item_id, rule_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (rule_id) REFERENCES item_block_rules(id) ON DELETE CASCADE
);

CREATE INDEX idx_item_blocks_rule_id ON item_blocks(rule_id);

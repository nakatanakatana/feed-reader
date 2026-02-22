-- name: GetFeed :one
SELECT
  f.*,
  ff.last_fetched_at,
  ff.next_fetch
FROM
  feeds f
LEFT JOIN
  feed_fetcher ff ON f.id = ff.feed_id
WHERE
  f.id = ?;

-- name: GetFeedByURL :one
SELECT
  f.*,
  ff.last_fetched_at,
  ff.next_fetch
FROM
  feeds f
LEFT JOIN
  feed_fetcher ff ON f.id = ff.feed_id
WHERE
  f.url = ?;

-- name: ListFeeds :many
SELECT
  f.*,
  ff.last_fetched_at,
  ff.next_fetch
FROM
  feeds f
LEFT JOIN
  feed_fetcher ff ON f.id = ff.feed_id
WHERE
  (sqlc.narg('tag_id') IS NULL OR EXISTS (
    SELECT 1 FROM feed_tags ft WHERE ft.feed_id = f.id AND ft.tag_id = sqlc.narg('tag_id')
  ))
ORDER BY
  f.updated_at ASC;

-- name: ListFeedsByIDs :many
SELECT
  f.*,
  ff.last_fetched_at,
  ff.next_fetch
FROM
  feeds f
LEFT JOIN
  feed_fetcher ff ON f.id = ff.feed_id
WHERE
  f.id IN (sqlc.slice('ids'));

-- name: CreateFeed :one
INSERT INTO feeds (
  id,
  url,
  link,
  title,
  description,
  lang,
  image_url,
  copyright,
  feed_type,
  feed_version
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
)
RETURNING *;

-- name: UpdateFeed :one
UPDATE
  feeds
SET
  link = ?,
  title = ?,
  description = ?,
  lang = ?,
  image_url = ?,
  copyright = ?,
  feed_type = ?,
  feed_version = ?,
  updated_at = (strftime('%FT%TZ', 'now'))
WHERE
  id = ?
RETURNING *;

-- name: DeleteFeed :exec
DELETE FROM
  feeds
WHERE
  id = ?;

-- name: CreateItem :one
INSERT INTO items (
  id,
  url,
  title,
  description,
  published_at,
  author,
  guid,
  content,
  image_url,
  categories
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
)
ON CONFLICT(url) DO UPDATE SET
  title = excluded.title,
  description = excluded.description,
  author = excluded.author,
  guid = excluded.guid,
  content = excluded.content,
  image_url = excluded.image_url,
  categories = excluded.categories,
  updated_at = (strftime('%FT%TZ', 'now'))
RETURNING *;

-- name: CreateFeedItem :exec
INSERT INTO feed_items (
  feed_id,
  item_id,
  published_at
) VALUES (
  ?, ?, ?
)
ON CONFLICT(feed_id, item_id) DO UPDATE SET
  published_at = excluded.published_at,
  updated_at = (strftime('%FT%TZ', 'now'));

-- name: CreateItemRead :exec
INSERT INTO item_reads (
  item_id
) VALUES (
  ?
)
ON CONFLICT(item_id) DO NOTHING;

-- name: MarkFeedFetched :exec
INSERT INTO feed_fetcher (
  feed_id,
  last_fetched_at,
  next_fetch
) VALUES (
  ?, ?, ?
)
ON CONFLICT(feed_id) DO UPDATE SET
  last_fetched_at = COALESCE(excluded.last_fetched_at, feed_fetcher.last_fetched_at),
  next_fetch = COALESCE(excluded.next_fetch, feed_fetcher.next_fetch),
  updated_at = (strftime('%FT%TZ', 'now'));

-- name: GetItem :one
SELECT
  i.id,
  i.url,
  i.title,
  i.description,
  i.published_at,
  i.author,
  i.guid,
  i.content,
  i.image_url,
  i.categories,
  i.created_at,
  fi.feed_id,
  CAST(COALESCE(ir.is_read, 0) AS INTEGER) AS is_read
FROM
  items i
JOIN
  feed_items fi ON i.id = fi.item_id
LEFT JOIN
  item_reads ir ON i.id = ir.item_id
WHERE
  i.id = ?;

-- name: ListItems :many
SELECT
  i.id,
  i.url,
  i.title,
  CAST(COALESCE(SUBSTR(i.description, 1, 140), '') AS TEXT) AS description,
  i.published_at,
  i.author,
  i.guid,
  i.content,
  i.image_url,
  i.categories,
  i.created_at,
  CAST(MIN(fi.feed_id) AS TEXT) AS feed_id,
  CAST(COALESCE(ir.is_read, 0) AS INTEGER) AS is_read
FROM
  items i
JOIN
  feed_items fi ON i.id = fi.item_id
LEFT JOIN
  item_reads ir ON i.id = ir.item_id
LEFT JOIN
  item_blocks ib ON i.id = ib.item_id
WHERE
  (sqlc.narg('feed_id') IS NULL OR fi.feed_id = sqlc.narg('feed_id')) AND
  (sqlc.narg('is_read') IS NULL OR COALESCE(ir.is_read, 0) = sqlc.narg('is_read')) AND
  (sqlc.narg('tag_id') IS NULL OR EXISTS (
    SELECT 1 FROM feed_tags ft WHERE ft.feed_id = fi.feed_id AND ft.tag_id = sqlc.narg('tag_id')
  )) AND
  (sqlc.narg('since') IS NULL OR i.created_at >= sqlc.narg('since')) AND
  (sqlc.narg('is_blocked') IS NULL OR (CASE WHEN ib.item_id IS NOT NULL THEN 1 ELSE 0 END = sqlc.narg('is_blocked')))
GROUP BY
  i.id
ORDER BY
  i.created_at ASC
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: ListRecentItemPublishedDates :many
SELECT
  published_at
FROM
  feed_items
WHERE
  feed_id = ? AND published_at IS NOT NULL
ORDER BY
  published_at DESC
LIMIT ?;

-- name: CountUnreadItemsPerFeed :many
SELECT
  fi.feed_id,
  COUNT(*) AS count
FROM
  feed_items fi
LEFT JOIN
  item_reads ir ON fi.item_id = ir.item_id
WHERE
  COALESCE(ir.is_read, 0) = 0 AND
  NOT EXISTS (SELECT 1 FROM item_blocks ib WHERE ib.item_id = fi.item_id)
GROUP BY
  fi.feed_id;

-- name: CountUnreadItemsPerTag :many
SELECT
  ft.tag_id,
  COUNT(DISTINCT fi.item_id) AS count
FROM
  feed_tags ft
JOIN
  feed_items fi ON ft.feed_id = fi.feed_id
LEFT JOIN
  item_reads ir ON fi.item_id = ir.item_id
WHERE
  COALESCE(ir.is_read, 0) = 0 AND
  NOT EXISTS (SELECT 1 FROM item_blocks ib WHERE ib.item_id = fi.item_id)
GROUP BY
  ft.tag_id;

-- name: CountFeedsPerTag :many
SELECT
  ft.tag_id,
  COUNT(DISTINCT ft.feed_id) AS count
FROM
  feed_tags ft
GROUP BY
  ft.tag_id;

-- name: CountTotalUnreadItems :one
SELECT
  COUNT(DISTINCT fi.item_id) AS count
FROM
  feed_items fi
LEFT JOIN
  item_reads ir ON fi.item_id = ir.item_id
WHERE
  COALESCE(ir.is_read, 0) = 0 AND
  NOT EXISTS (SELECT 1 FROM item_blocks ib WHERE ib.item_id = fi.item_id);

-- name: CountItems :one
SELECT
  COUNT(DISTINCT i.id)
FROM
  items i
JOIN
  feed_items fi ON i.id = fi.item_id
LEFT JOIN
  item_reads ir ON i.id = ir.item_id
LEFT JOIN
  item_blocks ib ON i.id = ib.item_id
WHERE
  (sqlc.narg('feed_id') IS NULL OR fi.feed_id = sqlc.narg('feed_id')) AND
  (sqlc.narg('is_read') IS NULL OR COALESCE(ir.is_read, 0) = sqlc.narg('is_read')) AND
  (sqlc.narg('tag_id') IS NULL OR EXISTS (
    SELECT 1 FROM feed_tags ft WHERE ft.feed_id = fi.feed_id AND ft.tag_id = sqlc.narg('tag_id')
  )) AND
  (sqlc.narg('since') IS NULL OR i.created_at >= sqlc.narg('since')) AND
  (sqlc.narg('is_blocked') IS NULL OR (CASE WHEN ib.item_id IS NOT NULL THEN 1 ELSE 0 END = sqlc.narg('is_blocked')));


-- name: SetItemRead :one
INSERT INTO item_reads (
  item_id,
  is_read,
  read_at
) VALUES (
  ?, ?, ?
)
ON CONFLICT(item_id) DO UPDATE SET
  is_read = excluded.is_read,
  read_at = excluded.read_at,
  updated_at = (strftime('%FT%TZ', 'now'))
RETURNING *;

-- name: CreateTag :one
INSERT INTO tags (
  id,
  name
) VALUES (
  ?, ?
)
ON CONFLICT(name) DO UPDATE SET
  name = excluded.name
RETURNING *;

-- name: GetTagByName :one
SELECT
  *
FROM
  tags
WHERE
  name = ?;

-- name: ListTags :many
SELECT
  *
FROM
  tags
ORDER BY
  updated_at ASC;

-- name: DeleteTag :exec
DELETE FROM
  tags
WHERE
  id = ?;

-- name: CreateFeedTag :exec
INSERT INTO feed_tags (
  feed_id,
  tag_id
) VALUES (
  ?, ?
)
ON CONFLICT(feed_id, tag_id) DO NOTHING;

-- name: DeleteFeedTags :exec
DELETE FROM
  feed_tags
WHERE
  feed_id = ?;

-- name: DeleteFeedTag :exec
DELETE FROM
  feed_tags
WHERE
  feed_id = ? AND tag_id = ?;

-- name: ListTagsByFeedId :many
SELECT
  t.*
FROM
  tags t
JOIN
  feed_tags ft ON t.id = ft.tag_id
WHERE
  ft.feed_id = ?
ORDER BY
  t.name ASC;

-- name: ListTagsByFeedIDs :many
SELECT
  ft.feed_id,
  t.name
FROM
  tags t
JOIN
  feed_tags ft ON t.id = ft.tag_id
WHERE
  ft.feed_id IN (sqlc.slice('feed_ids'))
ORDER BY
  t.name ASC;

-- name: ListItemFeeds :many
SELECT
  fi.feed_id,
  f.title AS feed_title,
  fi.published_at,
  fi.created_at
FROM
  feed_items fi
JOIN
  feeds f ON fi.feed_id = f.id
WHERE
  fi.item_id = ?;

-- name: ListFeedTags :many
SELECT
  feed_id,
  tag_id
FROM
  feed_tags
WHERE
  (sqlc.narg('feed_id') IS NULL OR feed_id = sqlc.narg('feed_id'))
  AND (sqlc.narg('tag_id') IS NULL OR tag_id = sqlc.narg('tag_id'));

-- name: GetFeedFetcher :one
SELECT
  *
FROM
  feed_fetcher
WHERE
  feed_id = ?;

-- name: UpsertFeedFetcher :one
INSERT INTO feed_fetcher (
  feed_id,
  etag,
  last_modified,
  last_fetched_at,
  next_fetch
) VALUES (
  ?, ?, ?, ?, ?
)
ON CONFLICT(feed_id) DO UPDATE SET
  etag = excluded.etag,
  last_modified = excluded.last_modified,
  last_fetched_at = COALESCE(excluded.last_fetched_at, feed_fetcher.last_fetched_at),
  next_fetch = COALESCE(excluded.next_fetch, feed_fetcher.next_fetch),
  updated_at = (strftime('%FT%TZ', 'now'))
RETURNING *;

-- name: DeleteFeedFetcher :exec
DELETE FROM
  feed_fetcher
WHERE
  feed_id = ?;

-- name: ListFeedsToFetch :many
SELECT
  f.*,
  ff.last_fetched_at,
  ff.next_fetch,
  ff.etag,
  ff.last_modified
FROM
  feeds f
LEFT JOIN
  feed_fetcher ff ON f.id = ff.feed_id
WHERE
  ff.next_fetch IS NULL OR ff.next_fetch <= (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
ORDER BY
  ff.next_fetch ASC;

-- name: CreateURLParsingRule :one
INSERT INTO url_parsing_rules (
  id,
  domain,
  rule_type,
  pattern
) VALUES (
  ?, ?, ?, ?
)
ON CONFLICT(domain, rule_type) DO UPDATE SET
  pattern = excluded.pattern,
  updated_at = (strftime('%FT%TZ', 'now'))
RETURNING *;

-- name: ListURLParsingRules :many
SELECT
  *
FROM
  url_parsing_rules
ORDER BY
  domain ASC, rule_type ASC;

-- name: GetURLParsingRule :one
SELECT
  *
FROM
  url_parsing_rules
WHERE
  id = ?;

-- name: DeleteURLParsingRule :exec
DELETE FROM
  url_parsing_rules
WHERE
  id = ?;

-- name: CreateItemBlockRule :one
INSERT INTO item_block_rules (
  id,
  rule_type,
  rule_value,
  domain
) VALUES (
  ?, ?, ?, ?
)
ON CONFLICT(rule_type, rule_value, domain) DO UPDATE SET
  updated_at = (strftime('%FT%TZ', 'now'))
RETURNING *;

-- name: ListItemBlockRules :many
SELECT
  *
FROM
  item_block_rules
ORDER BY
  rule_type ASC, rule_value ASC;

-- name: DeleteItemBlockRule :exec
DELETE FROM
  item_block_rules
WHERE
  id = ?;

-- name: CreateItemBlock :exec
INSERT INTO item_blocks (
  item_id,
  rule_id
) VALUES (
  ?, ?
)
ON CONFLICT(item_id, rule_id) DO NOTHING;

-- name: ListItemBlocks :many
SELECT
  *
FROM
  item_blocks
WHERE
  item_id = ?;

-- name: DeleteItemBlocksByRuleID :exec
DELETE FROM
  item_blocks
WHERE
  rule_id = ?;

-- name: ListItemsForBlocking :many
SELECT
  i.*,
  fi.feed_id,
  CAST(COALESCE(ir.is_read, 0) AS INTEGER) AS is_read
FROM
  items i
JOIN
  feed_items fi ON i.id = fi.item_id
LEFT JOIN
  item_reads ir ON i.id = ir.item_id;

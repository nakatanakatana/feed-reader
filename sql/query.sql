-- name: GetFeed :one
SELECT
  *
FROM
  feeds
WHERE
  uuid = ?;

-- name: ListFeeds :many
SELECT
  *
FROM
  feeds
ORDER BY
  created_at DESC;

-- name: ListFeedsByUUIDs :many
SELECT
  *
FROM
  feeds
WHERE
  uuid IN (sqlc.slice('uuids'));

-- name: CreateFeed :one
INSERT INTO feeds (
  uuid,
  url,
  link,
  title,
  description,
  language,
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
  language = ?,
  image_url = ?,
  copyright = ?,
  feed_type = ?,
  feed_version = ?,
  last_fetched_at = ?,
  updated_at = CURRENT_TIMESTAMP
WHERE
  uuid = ?
RETURNING *;

-- name: DeleteFeed :exec
DELETE FROM
  feeds
WHERE
  uuid = ?;

-- name: ListItemsByFeed :many
SELECT
  i.*
FROM
  items i
JOIN
  feed_items fi ON i.id = fi.item_id
WHERE
  fi.feed_id = ?
ORDER BY
  i.published_at DESC;

-- name: CreateItem :one
INSERT INTO items (
  id,
  url,
  title,
  description,
  published_at,
  guid
) VALUES (
  ?, ?, ?, ?, ?, ?
)
ON CONFLICT(url) DO UPDATE SET
  title = excluded.title,
  description = excluded.description,
  published_at = excluded.published_at,
  guid = excluded.guid,
  updated_at = CURRENT_TIMESTAMP
RETURNING *;

-- name: CreateFeedItem :exec
INSERT INTO feed_items (
  feed_id,
  item_id
) VALUES (
  ?, ?
)
ON CONFLICT(feed_id, item_id) DO NOTHING;

-- name: CreateItemRead :exec
INSERT INTO item_reads (
  item_id
) VALUES (
  ?
)
ON CONFLICT(item_id) DO NOTHING;

-- name: MarkFeedFetched :exec
UPDATE
  feeds
SET
  last_fetched_at = ?,
  updated_at = CURRENT_TIMESTAMP
WHERE
  uuid = ?;

-- name: GetItem :one
SELECT
  i.id,
  i.url,
  i.title,
  i.description,
  i.published_at,
  fi.feed_id,
  CAST(COALESCE(ir.is_read, 0) AS INTEGER) AS is_read,
  CAST(COALESCE(isv.is_saved, 0) AS INTEGER) AS is_saved
FROM
  items i
JOIN
  feed_items fi ON i.id = fi.item_id
LEFT JOIN
  item_reads ir ON i.id = ir.item_id
LEFT JOIN
  item_saves isv ON i.id = isv.item_id
WHERE
  i.id = ?;

-- name: ListItems :many
SELECT
  i.id,
  i.url,
  i.title,
  i.description,
  i.published_at,
  fi.feed_id,
  CAST(COALESCE(ir.is_read, 0) AS INTEGER) AS is_read,
  CAST(COALESCE(isv.is_saved, 0) AS INTEGER) AS is_saved
FROM
  items i
JOIN
  feed_items fi ON i.id = fi.item_id
LEFT JOIN
  item_reads ir ON i.id = ir.item_id
LEFT JOIN
  item_saves isv ON i.id = isv.item_id
WHERE
  (sqlc.narg('feed_id') IS NULL OR fi.feed_id = sqlc.narg('feed_id')) AND
  (sqlc.narg('is_read') IS NULL OR COALESCE(ir.is_read, 0) = sqlc.narg('is_read')) AND
  (sqlc.narg('is_saved') IS NULL OR COALESCE(isv.is_saved, 0) = sqlc.narg('is_saved'))
ORDER BY
  i.published_at DESC
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: ListItemsAsc :many
SELECT
  i.id,
  i.url,
  i.title,
  i.description,
  i.published_at,
  fi.feed_id,
  CAST(COALESCE(ir.is_read, 0) AS INTEGER) AS is_read,
  CAST(COALESCE(isv.is_saved, 0) AS INTEGER) AS is_saved
FROM
  items i
JOIN
  feed_items fi ON i.id = fi.item_id
LEFT JOIN
  item_reads ir ON i.id = ir.item_id
LEFT JOIN
  item_saves isv ON i.id = isv.item_id
WHERE
  (sqlc.narg('feed_id') IS NULL OR fi.feed_id = sqlc.narg('feed_id')) AND
  (sqlc.narg('is_read') IS NULL OR COALESCE(ir.is_read, 0) = sqlc.narg('is_read')) AND
  (sqlc.narg('is_saved') IS NULL OR COALESCE(isv.is_saved, 0) = sqlc.narg('is_saved'))
ORDER BY
  i.published_at ASC
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: CountItems :one
SELECT
  COUNT(*)
FROM
  items i
JOIN
  feed_items fi ON i.id = fi.item_id
LEFT JOIN
  item_reads ir ON i.id = ir.item_id
LEFT JOIN
  item_saves isv ON i.id = isv.item_id
WHERE
  (sqlc.narg('feed_id') IS NULL OR fi.feed_id = sqlc.narg('feed_id')) AND
  (sqlc.narg('is_read') IS NULL OR COALESCE(ir.is_read, 0) = sqlc.narg('is_read')) AND
  (sqlc.narg('is_saved') IS NULL OR COALESCE(isv.is_saved, 0) = sqlc.narg('is_saved'));

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
  updated_at = CURRENT_TIMESTAMP
RETURNING *;

-- name: SetItemSaved :one
INSERT INTO item_saves (
  item_id,
  is_saved,
  saved_at
) VALUES (
  ?, ?, ?
)
ON CONFLICT(item_id) DO UPDATE SET
  is_saved = excluded.is_saved,
  saved_at = excluded.saved_at,
  updated_at = CURRENT_TIMESTAMP
RETURNING *;

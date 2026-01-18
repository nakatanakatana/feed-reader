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
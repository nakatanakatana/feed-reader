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

-- name: ListGlobalItems :many
SELECT
  i.id,
  i.url,
  i.title,
  i.description,
  i.published_at,
  i.guid,
  i.created_at,
  i.updated_at,
  fi.feed_id,
  COALESCE(ir.is_read, 0) AS is_read
FROM
  items i
  JOIN feed_items fi ON i.id = fi.item_id
  LEFT JOIN item_reads ir ON i.id = ir.item_id
WHERE
  (
    sqlc.narg('cursor_published_at') IS NULL
    OR i.published_at < sqlc.narg('cursor_published_at')
    OR (
      i.published_at = sqlc.narg('cursor_published_at')
      AND i.id < sqlc.narg('cursor_id')
    )
  )
  AND (
    sqlc.arg('filter_unread') = 0
    OR COALESCE(ir.is_read, 0) = 0
  )
ORDER BY
  i.published_at DESC, i.id DESC
LIMIT sqlc.arg('limit');

-- name: ListFeedItems :many
SELECT
  i.id,
  i.url,
  i.title,
  i.description,
  i.published_at,
  i.guid,
  i.created_at,
  i.updated_at,
  fi.feed_id,
  COALESCE(ir.is_read, 0) AS is_read
FROM
  items i
  JOIN feed_items fi ON i.id = fi.item_id
  LEFT JOIN item_reads ir ON i.id = ir.item_id
WHERE
  fi.feed_id = sqlc.arg('feed_id')
  AND (
    sqlc.narg('cursor_published_at') IS NULL
    OR i.published_at < sqlc.narg('cursor_published_at')
    OR (
      i.published_at = sqlc.narg('cursor_published_at')
      AND i.id < sqlc.narg('cursor_id')
    )
  )
  AND (
    sqlc.arg('filter_unread') = 0
    OR COALESCE(ir.is_read, 0) = 0
  )
ORDER BY
  i.published_at DESC, i.id DESC
LIMIT sqlc.arg('limit');

-- name: GetItem :one
SELECT
  i.id,
  i.url,
  i.title,
  i.description,
  i.published_at,
  i.guid,
  i.created_at,
  i.updated_at,
  fi.feed_id,
  COALESCE(ir.is_read, 0) AS is_read
FROM
  items i
  JOIN feed_items fi ON i.id = fi.item_id
  LEFT JOIN item_reads ir ON i.id = ir.item_id
WHERE
  i.id = ?;

-- name: MarkItemRead :one
INSERT INTO item_reads (
  item_id,
  is_read,
  read_at,
  updated_at
) VALUES (
  ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT(item_id) DO UPDATE SET
  is_read = 1,
  read_at = CURRENT_TIMESTAMP,
  updated_at = CURRENT_TIMESTAMP
RETURNING *;
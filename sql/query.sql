-- name: GetFeed :one
SELECT
  *
FROM
  feeds
WHERE
  id = ?;

-- name: GetFeedByURL :one
SELECT
  *
FROM
  feeds
WHERE
  url = ?;

-- name: ListFeeds :many
SELECT
  f.*
FROM
  feeds f
WHERE
  (sqlc.narg('tag_id') IS NULL OR EXISTS (
    SELECT 1 FROM feed_tags ft WHERE ft.feed_id = f.id AND ft.tag_id = sqlc.narg('tag_id')
  ))
ORDER BY
  updated_at ASC;

-- name: ListFeedsByIDs :many
SELECT
  *
FROM
  feeds
WHERE
  id IN (sqlc.slice('ids'));

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
  last_fetched_at = ?,
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
UPDATE
  feeds
SET
  last_fetched_at = ?,
  updated_at = (strftime('%FT%TZ', 'now'))
WHERE
  id = ?;

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
WHERE
  (sqlc.narg('feed_id') IS NULL OR fi.feed_id = sqlc.narg('feed_id')) AND
  (sqlc.narg('is_read') IS NULL OR COALESCE(ir.is_read, 0) = sqlc.narg('is_read')) AND
  (sqlc.narg('tag_id') IS NULL OR EXISTS (
    SELECT 1 FROM feed_tags ft WHERE ft.feed_id = fi.feed_id AND ft.tag_id = sqlc.narg('tag_id')
  )) AND
  (sqlc.narg('since') IS NULL OR i.created_at >= sqlc.narg('since'))
GROUP BY
  i.id
ORDER BY
  i.created_at ASC
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: CountUnreadItemsPerFeed :many
SELECT
  fi.feed_id,
  COUNT(*) AS count
FROM
  feed_items fi
LEFT JOIN
  item_reads ir ON fi.item_id = ir.item_id
WHERE
  COALESCE(ir.is_read, 0) = 0
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
  COALESCE(ir.is_read, 0) = 0
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
  COALESCE(ir.is_read, 0) = 0;

-- name: CountItems :one
SELECT
  COUNT(DISTINCT i.id)
FROM
  items i
JOIN
  feed_items fi ON i.id = fi.item_id
LEFT JOIN
  item_reads ir ON i.id = ir.item_id
WHERE
  (sqlc.narg('feed_id') IS NULL OR fi.feed_id = sqlc.narg('feed_id')) AND
  (sqlc.narg('is_read') IS NULL OR COALESCE(ir.is_read, 0) = sqlc.narg('is_read')) AND
  (sqlc.narg('tag_id') IS NULL OR EXISTS (
    SELECT 1 FROM feed_tags ft WHERE ft.feed_id = fi.feed_id AND ft.tag_id = sqlc.narg('tag_id')
  )) AND
  (sqlc.narg('since') IS NULL OR i.created_at >= sqlc.narg('since'));


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
RETURNING *;

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

-- name: GetFeedFetcherCache :one
SELECT
  *
FROM
  feed_fetcher_cache
WHERE
  feed_id = ?;

-- name: UpsertFeedFetcherCache :one
INSERT INTO feed_fetcher_cache (
  feed_id,
  etag,
  last_modified
) VALUES (
  ?, ?, ?
)
ON CONFLICT(feed_id) DO UPDATE SET
  etag = excluded.etag,
  last_modified = excluded.last_modified,
  updated_at = (strftime('%FT%TZ', 'now'))
RETURNING *;

-- name: DeleteFeedFetcherCache :exec
DELETE FROM
  feed_fetcher_cache
WHERE
  feed_id = ?;

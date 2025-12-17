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
  url = ?,
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

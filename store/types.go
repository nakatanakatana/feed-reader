package store

import "github.com/google/uuid"

type TagWithCount struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
	UnreadCount int64  `json:"unread_count"`
	FeedCount   int64  `json:"feed_count"`
}

type FullFeed struct {
	ID            string  `json:"id"`
	Url           string  `json:"url"`
	Link          *string `json:"link"`
	Title         *string `json:"title"`
	Description   *string `json:"description"`
	Lang          *string `json:"lang"`
	ImageUrl      *string `json:"image_url"`
	Copyright     *string `json:"copyright"`
	FeedType      *string `json:"feed_type"`
	FeedVersion   *string `json:"feed_version"`
	CreatedAt     string  `json:"created_at"`
	UpdatedAt     string  `json:"updated_at"`
	LastFetchedAt *string `json:"last_fetched_at"`
	NextFetch     *string `json:"next_fetch"`
}

// UUIDGenerator generates UUIDs.
type UUIDGenerator interface {
	NewRandom() (uuid.UUID, error)
}

type AuthorParams struct {
	Name  string
	Email *string
	Uri   *string
}

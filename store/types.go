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

// UUIDGenerator generates UUIDs.
type UUIDGenerator interface {
	NewRandom() (uuid.UUID, error)
}

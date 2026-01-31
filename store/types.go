package store

type TagWithCount struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
	UnreadCount int64  `json:"unread_count"`
	FeedCount   int64  `json:"feed_count"`
}

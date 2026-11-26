package telemetry_test

import (
	"testing"

	"github.com/nakatanakatana/feed-reader/internal/telemetry"
	"gotest.tools/v3/assert"
)

func TestSQLQuerySummary(t *testing.T) {
	tests := []struct {
		name  string
		query string
		want  string
	}{
		{
			name:  "sqlc one comment",
			query: "-- name: GetFeed :one\nSELECT id FROM feeds WHERE id = ?",
			want:  "GetFeed",
		},
		{
			name:  "sqlc many comment with leading whitespace",
			query: "\n  -- name: CountUnreadItemsPerFeed :many\nSELECT feed_id, COUNT(*) FROM items GROUP BY feed_id",
			want:  "CountUnreadItemsPerFeed",
		},
		{
			name:  "plain SQL without comment",
			query: "SELECT id FROM feeds WHERE id = ?",
			want:  "",
		},
		{
			name:  "non-sqlc comment",
			query: "-- regular comment\nSELECT 1",
			want:  "",
		},
		{
			name:  "empty sqlc name comment",
			query: "-- name:   \nSELECT 1",
			want:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, telemetry.SQLQuerySummary(tt.query), tt.want)
		})
	}
}

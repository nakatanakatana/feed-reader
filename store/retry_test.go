package store_test

import (
	"errors"
	"testing"

	"github.com/mattn/go-sqlite3"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
)

func TestIsBusyError(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{
			name: "SQLITE_BUSY",
			err: sqlite3.Error{
				Code: sqlite3.ErrBusy,
			},
			expected: true,
		},
		{
			name: "SQLITE_LOCKED",
			err: sqlite3.Error{
				Code: sqlite3.ErrLocked,
			},
			expected: true,
		},
		{
			name:     "Other SQLite error",
			err:      sqlite3.Error{Code: sqlite3.ErrConstraint},
			expected: false,
		},
		{
			name:     "Non-SQLite error",
			err:      errors.New("some error"),
			expected: false,
		},
		{
			name:     "Nil error",
			err:      nil,
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, store.IsBusyError(tt.err))
		})
	}
}

package store_test

import (
	"context"
	"errors"
	"testing"

	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	sqlite3 "modernc.org/sqlite/lib"
)

type mockSqliteError struct {
	code int
}

func (e mockSqliteError) Error() string { return "mock sqlite error" }
func (e mockSqliteError) Code() int     { return e.code }

func TestIsBusyError(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{
			name: "SQLITE_BUSY",
			err: mockSqliteError{
				code: sqlite3.SQLITE_BUSY,
			},
			expected: true,
		},
		{
			name: "SQLITE_LOCKED",
			err: mockSqliteError{
				code: sqlite3.SQLITE_LOCKED,
			},
			expected: true,
		},
		{
			name:     "Other SQLite error",
			err:      mockSqliteError{code: sqlite3.SQLITE_CONSTRAINT},
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

func TestWithRetry(t *testing.T) {
	t.Run("success on first attempt", func(t *testing.T) {
		count := 0
		err := store.WithRetry(context.Background(), func() error {
			count++
			return nil
		})
		assert.NoError(t, err)
		assert.Equal(t, 1, count)
	})

	t.Run("success after retries", func(t *testing.T) {
		count := 0
		err := store.WithRetry(context.Background(), func() error {
			count++
			if count < 3 {
				return mockSqliteError{code: sqlite3.SQLITE_BUSY}
			}
			return nil
		})
		assert.NoError(t, err)
		assert.Equal(t, 3, count)
	})

	t.Run("fail after max attempts", func(t *testing.T) {
		count := 0
		busyErr := mockSqliteError{code: sqlite3.SQLITE_BUSY}
		err := store.WithRetry(context.Background(), func() error {
			count++
			return busyErr
		})
		assert.ErrorIs(t, err, busyErr)
		assert.Equal(t, 10, count) // MaxRetries is 10
	})

	t.Run("no retry on non-busy error", func(t *testing.T) {
		count := 0
		otherErr := errors.New("other error")
		err := store.WithRetry(context.Background(), func() error {
			count++
			return otherErr
		})
		assert.ErrorIs(t, err, otherErr)
		assert.Equal(t, 1, count)
	})

	t.Run("respect context cancellation", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel()
		err := store.WithRetry(ctx, func() error {
			return mockSqliteError{code: sqlite3.SQLITE_BUSY}
		})
		assert.ErrorIs(t, err, context.Canceled)
	})
}

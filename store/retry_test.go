package store_test

import (
	"context"
	"errors"
	"testing"

	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

const (
	sqliteBusy       = 5
	sqliteLocked     = 6
	sqliteConstraint = 19
)

type mockSqliteError struct {
	code int
}

func (e mockSqliteError) Error() string { return "mock sqlite error" }
func (e mockSqliteError) Code() int     { return e.code }

// ErrorCode is a named uint8 type matching the ncruces sqlite3.ErrorCode shape.
type ErrorCode uint8

type mockNcrucesError struct {
	code ErrorCode
}

func (e mockNcrucesError) Error() string   { return "mock ncruces error" }
func (e mockNcrucesError) Code() ErrorCode { return e.code }

type wrappedError struct {
	inner error
	msg   string
}

func (e *wrappedError) Error() string { return e.msg + ": " + e.inner.Error() }
func (e *wrappedError) Unwrap() error { return e.inner }

type multiWrappedError struct {
	errs []error
	msg  string
}

func (e *multiWrappedError) Error() string   { return e.msg }
func (e *multiWrappedError) Unwrap() []error { return e.errs }

func TestIsBusyError(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{
			name: "SQLITE_BUSY",
			err: mockSqliteError{
				code: sqliteBusy,
			},
			expected: true,
		},
		{
			name: "SQLITE_LOCKED",
			err: mockSqliteError{
				code: sqliteLocked,
			},
			expected: true,
		},
		{
			name:     "Other SQLite error",
			err:      mockSqliteError{code: sqliteConstraint},
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
		{
			name:     "ncruces-shaped SQLITE_BUSY",
			err:      mockNcrucesError{code: sqliteBusy},
			expected: true,
		},
		{
			name:     "ncruces-shaped SQLITE_LOCKED",
			err:      mockNcrucesError{code: sqliteLocked},
			expected: true,
		},
		{
			name:     "ncruces-shaped non-busy error",
			err:      mockNcrucesError{code: sqliteConstraint},
			expected: false,
		},
		{
			name:     "wrapped modernc busy error",
			err:      &wrappedError{inner: mockSqliteError{code: sqliteBusy}, msg: "failed to create/update item"},
			expected: true,
		},
		{
			name:     "wrapped ncruces busy error",
			err:      &wrappedError{inner: mockNcrucesError{code: sqliteBusy}, msg: "failed to create/update item"},
			expected: true,
		},
		{
			name: "multi-wrapped with busy error",
			err: &multiWrappedError{
				errs: []error{errors.New("unrelated"), mockSqliteError{code: sqliteBusy}},
				msg:  "multiple errors",
			},
			expected: true,
		},
		{
			name:     "wrapped non-busy error",
			err:      &wrappedError{inner: mockSqliteError{code: sqliteConstraint}, msg: "constraint"},
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
		assert.NilError(t, err)
		assert.Equal(t, count, 1)
	})

	t.Run("success after retries", func(t *testing.T) {
		count := 0
		err := store.WithRetry(context.Background(), func() error {
			count++
			if count < 3 {
				return mockSqliteError{code: sqliteBusy}
			}
			return nil
		})
		assert.NilError(t, err)
		assert.Equal(t, count, 3)
	})

	t.Run("fail after max attempts", func(t *testing.T) {
		count := 0
		busyErr := mockSqliteError{code: sqliteBusy}
		err := store.WithRetry(context.Background(), func() error {
			count++
			return busyErr
		})
		assert.ErrorIs(t, err, busyErr)
		assert.Equal(t, count, 10) // MaxRetries is 10
	})

	t.Run("no retry on non-busy error", func(t *testing.T) {
		count := 0
		otherErr := errors.New("other error")
		err := store.WithRetry(context.Background(), func() error {
			count++
			return otherErr
		})
		assert.ErrorIs(t, err, otherErr)
		assert.Equal(t, count, 1)
	})

	t.Run("respect context cancellation", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel()
		err := store.WithRetry(ctx, func() error {
			return mockSqliteError{code: sqliteBusy}
		})
		assert.ErrorIs(t, err, context.Canceled)
	})

	t.Run("success after retries with ncruces-shaped error", func(t *testing.T) {
		count := 0
		err := store.WithRetry(context.Background(), func() error {
			count++
			if count < 3 {
				return mockNcrucesError{code: sqliteBusy}
			}
			return nil
		})
		assert.NilError(t, err)
		assert.Equal(t, count, 3)
	})
}

package store

import (
	"context"
	"errors"
	"time"

	"github.com/mattn/go-sqlite3"
)

const (
	maxRetries   = 10
	initialDelay = 10 * time.Millisecond
	maxDelay     = 100 * time.Millisecond
)

// IsBusyError returns true if the error is a SQLite busy or locked error.
func IsBusyError(err error) bool {
	var sqliteErr sqlite3.Error
	if errors.As(err, &sqliteErr) {
		return sqliteErr.Code == sqlite3.ErrBusy || sqliteErr.Code == sqlite3.ErrLocked
	}
	return false
}

// WithRetry executes the given operation and retries if it encounters a SQLite busy error.
func WithRetry(ctx context.Context, op func() error) error {
	var err error
	delay := initialDelay

	for i := 0; i < maxRetries; i++ {
		err = op()
		if err == nil {
			return nil
		}

		if !IsBusyError(err) {
			return err
		}

		if i == maxRetries-1 {
			return err
		}

		select {
		case <-time.After(delay):
			delay *= 2
			if delay > maxDelay {
				delay = maxDelay
			}
		case <-ctx.Done():
			return ctx.Err()
		}
	}

	return err
}

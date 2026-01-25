package store

import (
	"errors"

	"github.com/mattn/go-sqlite3"
)

// IsBusyError returns true if the error is a SQLite busy or locked error.
func IsBusyError(err error) bool {
	var sqliteErr sqlite3.Error
	if errors.As(err, &sqliteErr) {
		return sqliteErr.Code == sqlite3.ErrBusy || sqliteErr.Code == sqlite3.ErrLocked
	}
	return false
}

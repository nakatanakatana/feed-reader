package store_test

import (
	"context"
	"database/sql"
	"errors"
	"testing"

	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
	sqlite3 "modernc.org/sqlite/lib"
)

type mockDBTX struct {
	execContext     func(ctx context.Context, query string, args ...any) (sql.Result, error)
	prepareContext  func(ctx context.Context, query string) (*sql.Stmt, error)
	queryContext    func(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	queryRowContext func(ctx context.Context, query string, args ...any) *sql.Row
}

func (m *mockDBTX) ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error) {
	return m.execContext(ctx, query, args...)
}

func (m *mockDBTX) PrepareContext(ctx context.Context, query string) (*sql.Stmt, error) {
	return m.prepareContext(ctx, query)
}

func (m *mockDBTX) QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	return m.queryContext(ctx, query, args...)
}

func (m *mockDBTX) QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row {
	return m.queryRowContext(ctx, query, args...)
}

func TestRetryingDB_ExecContext(t *testing.T) {
	t.Run("retry on busy error", func(t *testing.T) {
		calls := 0
		busyErr := mockSqliteError{code: sqlite3.SQLITE_BUSY}
		mockResult := new(mockResult)
		m := &mockDBTX{
			execContext: func(ctx context.Context, query string, args ...any) (sql.Result, error) {
				calls++
				if calls == 1 {
					return mockResult, busyErr
				}
				return mockResult, nil
			},
		}
		rdb := store.NewRetryingDB(m)

		_, err := rdb.ExecContext(context.Background(), "query")
		assert.NilError(t, err)
		assert.Equal(t, calls, 2)
	})

	t.Run("fail on non-busy error", func(t *testing.T) {
		calls := 0
		otherErr := errors.New("other error")
		mockResult := new(mockResult)
		m := &mockDBTX{
			execContext: func(ctx context.Context, query string, args ...any) (sql.Result, error) {
				calls++
				return mockResult, otherErr
			},
		}
		rdb := store.NewRetryingDB(m)

		_, err := rdb.ExecContext(context.Background(), "query")
		assert.ErrorIs(t, err, otherErr)
		assert.Equal(t, calls, 1)
	})
}

func TestRetryingDB_PrepareContext(t *testing.T) {
	calls := 0
	busyErr := mockSqliteError{code: sqlite3.SQLITE_BUSY}
	stmt := &sql.Stmt{}
	m := &mockDBTX{
		prepareContext: func(ctx context.Context, query string) (*sql.Stmt, error) {
			calls++
			if calls == 1 {
				return stmt, busyErr
			}
			return stmt, nil
		},
	}
	rdb := store.NewRetryingDB(m)

	_, err := rdb.PrepareContext(context.Background(), "query")
	assert.NilError(t, err)
	assert.Equal(t, calls, 2)
}

type mockResult struct{}

func (m *mockResult) LastInsertId() (int64, error) { return 0, nil }
func (m *mockResult) RowsAffected() (int64, error) { return 0, nil }

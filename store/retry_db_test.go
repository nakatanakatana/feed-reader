package store_test

import (
	"context"
	"database/sql"
	"errors"
	"testing"

	"github.com/mattn/go-sqlite3"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type mockDBTX struct {
	mock.Mock
}

func (m *mockDBTX) ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	ret := m.Called(ctx, query, args)
	return ret.Get(0).(sql.Result), ret.Error(1)
}

func (m *mockDBTX) PrepareContext(ctx context.Context, query string) (*sql.Stmt, error) {
	ret := m.Called(ctx, query)
	return ret.Get(0).(*sql.Stmt), ret.Error(1)
}

func (m *mockDBTX) QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	ret := m.Called(ctx, query, args)
	return ret.Get(0).(*sql.Rows), ret.Error(1)
}

func (m *mockDBTX) QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row {
	ret := m.Called(ctx, query, args)
	return ret.Get(0).(*sql.Row)
}

func TestRetryingDB_ExecContext(t *testing.T) {
	t.Run("retry on busy error", func(t *testing.T) {
		m := new(mockDBTX)
		rdb := store.NewRetryingDB(m)
		busyErr := sqlite3.Error{Code: sqlite3.ErrBusy}
		mockResult := new(mockResult)

		m.On("ExecContext", mock.Anything, "query", mock.Anything).Return(mockResult, busyErr).Once()
		m.On("ExecContext", mock.Anything, "query", mock.Anything).Return(mockResult, nil).Once()

		_, err := rdb.ExecContext(context.Background(), "query")
		assert.NoError(t, err)
		m.AssertExpectations(t)
	})

	t.Run("fail on non-busy error", func(t *testing.T) {
		m := new(mockDBTX)
		rdb := store.NewRetryingDB(m)
		otherErr := errors.New("other error")
		mockResult := new(mockResult)

		m.On("ExecContext", mock.Anything, "query", mock.Anything).Return(mockResult, otherErr).Once()

		_, err := rdb.ExecContext(context.Background(), "query")
		assert.ErrorIs(t, err, otherErr)
		m.AssertExpectations(t)
	})
}

type mockResult struct{}

func (m *mockResult) LastInsertId() (int64, error) { return 0, nil }
func (m *mockResult) RowsAffected() (int64, error) { return 0, nil }

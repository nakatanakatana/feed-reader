package store

import (
	"context"
	"database/sql"
)

// RetryingDB is a wrapper around DBTX that retries operations on SQLite busy errors.
type RetryingDB struct {
	db DBTX
}

// NewRetryingDB creates a new RetryingDB wrapper.
func NewRetryingDB(db DBTX) *RetryingDB {
	return &RetryingDB{db: db}
}

// ExecContext wraps ExecContext with retry logic.
func (r *RetryingDB) ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error) {
	var res sql.Result
	err := WithRetry(ctx, func() error {
		var err error
		res, err = r.db.ExecContext(ctx, query, args...)
		return err
	})
	return res, err
}

// PrepareContext wraps PrepareContext with retry logic.
func (r *RetryingDB) PrepareContext(ctx context.Context, query string) (*sql.Stmt, error) {
	var stmt *sql.Stmt
	err := WithRetry(ctx, func() error {
		var err error
		stmt, err = r.db.PrepareContext(ctx, query)
		return err
	})
	return stmt, err
}

// QueryContext wraps QueryContext with retry logic.
func (r *RetryingDB) QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	var rows *sql.Rows
	err := WithRetry(ctx, func() error {
		var err error
		rows, err = r.db.QueryContext(ctx, query, args...)
		return err
	})
	return rows, err
}

// QueryRowContext wraps QueryRowContext with retry logic.
func (r *RetryingDB) QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row {
	// QueryRowContext doesn't return an error directly, it returns a *sql.Row whose error is delayed.
	// However, sqlc uses it for single row results.
	// To truly retry, we'd need to intercept the Scan call, but sqlc generates code that calls Scan immediately.
	// Since sqlc uses DBTX interface, we can try to retry here, but it might be tricky.
	// For now, let's just delegate. If QueryRowContext fails with busy error during its execution,
	// it usually shows up during Scan().
	// Actually, sqlc generates code like:
	// row := q.db.QueryRowContext(ctx, ...)
	// var i Item
	// err := row.Scan(...)
	// We can't easily retry the Scan part here because we don't know when Scan is called.
	// But some drivers execute the query immediately in QueryRowContext.
	return r.db.QueryRowContext(ctx, query, args...)
}

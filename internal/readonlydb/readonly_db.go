package readonlydb

import (
	"context"
	"database/sql"
	"fmt"
	"sync"

	"github.com/XSAM/otelsql"
	"github.com/nakatanakatana/feed-reader/internal/telemetry"
	_ "github.com/ncruces/go-sqlite3/driver"
)

var (
	readonlyOTELOne       sync.Once
	readonlyOTELDriver    string
	readonlyOTELDriverErr error
)

func readonlyOTELDriverName() (string, error) {
	readonlyOTELOne.Do(func() {
		readonlyOTELDriver, readonlyOTELDriverErr = otelsql.Register(
			"sqlite3",
			telemetry.SQLiteOTelOptions()...,
		)
	})
	return readonlyOTELDriver, readonlyOTELDriverErr
}

func OpenReadOnlyDB(dsn string, maxOpenConnections int) (*sql.DB, error) {
	if maxOpenConnections <= 0 {
		return nil, fmt.Errorf("readonly max open connections must be positive")
	}
	driverName, err := readonlyOTELDriverName()
	if err != nil {
		return nil, fmt.Errorf("register readonly sqlite driver: %w", err)
	}
	db, err := sql.Open(driverName, dsn)
	if err != nil {
		return nil, fmt.Errorf("open readonly database: %w", err)
	}
	db.SetMaxOpenConns(maxOpenConnections)
	db.SetMaxIdleConns(maxOpenConnections)
	return db, nil
}

func VerifyReadOnlyDB(db *sql.DB) error {
	return VerifyReadOnlyDBContext(context.Background(), db)
}

func VerifyReadOnlyDBContext(ctx context.Context, db *sql.DB) error {
	var schemaVersion int
	if err := db.QueryRowContext(ctx, "PRAGMA schema_version").Scan(&schemaVersion); err != nil {
		return fmt.Errorf("verify readonly database: %w", err)
	}
	return nil
}

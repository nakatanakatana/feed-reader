package readonlydb

import (
	"database/sql"
	"fmt"
	"sync"

	"github.com/XSAM/otelsql"
	_ "github.com/ncruces/go-sqlite3/driver"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
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
			otelsql.WithAttributes(semconv.DBSystemSqlite),
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
	if err := VerifyReadOnlyDB(db); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

func VerifyReadOnlyDB(db *sql.DB) error {
	var schemaVersion int
	if err := db.QueryRow("PRAGMA schema_version").Scan(&schemaVersion); err != nil {
		return fmt.Errorf("verify readonly database: %w", err)
	}
	return nil
}

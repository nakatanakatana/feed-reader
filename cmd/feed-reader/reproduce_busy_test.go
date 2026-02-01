package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"sync"
	"testing"

	"github.com/nakatanakatana/feed-reader/sql"
	_ "modernc.org/sqlite"
)

func TestReproduceSQLiteBusy(t *testing.T) {
	dbPath := "reproduce_busy.db"
	defer os.Remove(dbPath)

	ctx := context.Background()

	// Initialize schema
	if err := schema.Migrate(ctx, dbPath, schema.Schema, false); err != nil {
		t.Fatalf("failed to migrate database: %v", err)
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	// Disable WAL for easier reproduction of Busy errors
	// (Though modernc usually has it off by default, let's be explicit if needed)
	_, _ = db.Exec("PRAGMA journal_mode=DELETE;")

	const (
		concurrency = 50
		iterations  = 20
	)

	var wg sync.WaitGroup
	errs := make(chan error, concurrency*iterations)

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for j := 0; j < iterations; j++ {
				_, err := db.ExecContext(ctx, "INSERT INTO tags (id, name) VALUES (?, ?)", 
					fmt.Sprintf("tag-%d-%d", id, j), 
					fmt.Sprintf("Name %d-%d", id, j))
				if err != nil {
					errs <- err
				}
			}
		}(i)
	}

	wg.Wait()
	close(errs)

	busyCount := 0
	for err := range errs {
		if err != nil {
			t.Logf("Error: %v", err)
			busyCount++
		}
	}

	if busyCount > 0 {
		t.Logf("Reproduced %d errors (likely Busy/Locked)", busyCount)
	} else {
		t.Log("Did not reproduce any errors")
	}
}

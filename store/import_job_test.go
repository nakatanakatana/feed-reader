package store_test

import (
	"context"
	"database/sql"
	"testing"

	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	_ "modernc.org/sqlite"
)

func TestImportJob(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer func() {
		_ = db.Close()
	}()

	if _, err := db.ExecContext(context.Background(), schema.Schema); err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}

	s := store.NewStore(db)
	ctx := context.Background()

	jobID := uuid.New().String()
	
	// Create job
	job, err := s.CreateImportJob(ctx, store.CreateImportJobParams{
		ID:         jobID,
		Status:     "queued",
		TotalFeeds: 10,
	})
	if err != nil {
		t.Fatalf("failed to create import job: %v", err)
	}

	if job.ID != jobID {
		t.Errorf("expected job ID %s, got %s", jobID, job.ID)
	}
	if job.Status != "queued" {
		t.Errorf("expected status queued, got %s", job.Status)
	}
	if job.TotalFeeds != 10 {
		t.Errorf("expected total feeds 10, got %d", job.TotalFeeds)
	}

	// Update job
	failedFeeds := `["http://example.com/fail"]`
	updatedJob, err := s.UpdateImportJob(ctx, store.UpdateImportJobParams{
		ID:             jobID,
		Status:         "processing",
		ProcessedFeeds: 5,
		FailedFeeds:    &failedFeeds,
	})
	if err != nil {
		t.Fatalf("failed to update import job: %v", err)
	}

	if updatedJob.Status != "processing" {
		t.Errorf("expected status processing, got %s", updatedJob.Status)
	}
	if updatedJob.ProcessedFeeds != 5 {
		t.Errorf("expected processed feeds 5, got %d", updatedJob.ProcessedFeeds)
	}
	if *updatedJob.FailedFeeds != failedFeeds {
		t.Errorf("expected failed feeds %s, got %s", failedFeeds, *updatedJob.FailedFeeds)
	}

	// Get job
	fetchedJob, err := s.GetImportJob(ctx, jobID)
	if err != nil {
		t.Fatalf("failed to get import job: %v", err)
	}

	if fetchedJob.ID != jobID {
		t.Errorf("expected job ID %s, got %s", jobID, fetchedJob.ID)
	}
}

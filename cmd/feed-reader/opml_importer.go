package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	feedv1 "github.com/nakatanakatana/feed-reader/gen/go/feed/v1"
	"github.com/nakatanakatana/feed-reader/store"
)

type OPMLImporter struct {
	store      *store.Store
	fetcher    FeedFetcher
	pool       *WorkerPool
	writeQueue *WriteQueueService
	logger     *slog.Logger
	uuidGen    UUIDGenerator
}

func NewOPMLImporter(s *store.Store, f FeedFetcher, p *WorkerPool, wq *WriteQueueService, l *slog.Logger, uuidGen UUIDGenerator) *OPMLImporter {
	if uuidGen == nil {
		uuidGen = realUUIDGenerator{}
	}
	return &OPMLImporter{
		store:      s,
		fetcher:    f,
		pool:       p,
		writeQueue: wq,
		logger:     l,
		uuidGen:    uuidGen,
	}
}

func (i *OPMLImporter) StartImportJob(ctx context.Context, opmlContent []byte) (string, error) {
	opmlFeeds, err := ParseOPML(opmlContent)
	if err != nil {
		return "", fmt.Errorf("failed to parse OPML: %w", err)
	}

	newUUID, err := i.uuidGen.NewRandom()
	if err != nil {
		return "", fmt.Errorf("failed to generate UUID: %w", err)
	}
	jobID := newUUID.String()

	// Create job record
	_, err = i.store.CreateImportJob(ctx, store.CreateImportJobParams{
		ID:         jobID,
		Status:     "queued",
		TotalFeeds: int64(len(opmlFeeds)),
	})
	if err != nil {
		return "", fmt.Errorf("failed to create import job record: %w", err)
	}

	// Start background task
	i.pool.AddTask(func(ctx context.Context) error {
		i.processJob(ctx, jobID, opmlFeeds)
		return nil
	})

	return jobID, nil
}

func (i *OPMLImporter) processJob(ctx context.Context, jobID string, feeds []OpmlFeed) {
	i.logger.InfoContext(ctx, "starting OPML import job", "job_id", jobID, "count", len(feeds))

	// Update status to processing
	_, _ = i.store.UpdateImportJob(ctx, store.UpdateImportJobParams{
		ID:     jobID,
		Status: "processing",
	})

	processed := 0
	failedURLs := []string{}

	for _, f := range feeds {
		err := i.importOne(ctx, f)
		if err != nil {
			i.logger.ErrorContext(ctx, "failed to import feed from OPML", "url", f.URL, "error", err)
			failedURLs = append(failedURLs, f.URL)
		}
		processed++

		// Periodic update? For now every feed.
		var failedFeedsJSON *string
		if len(failedURLs) > 0 {
			if b, err := json.Marshal(failedURLs); err == nil {
				s := string(b)
				failedFeedsJSON = &s
			}
		}

		_, _ = i.store.UpdateImportJob(ctx, store.UpdateImportJobParams{
			ID:             jobID,
			Status:         "processing",
			ProcessedFeeds: int64(processed),
			FailedFeeds:    failedFeedsJSON,
		})
	}

	status := "completed"
	if len(failedURLs) == len(feeds) && len(feeds) > 0 {
		status = "failed"
	}

	var failedFeedsJSON *string
	if len(failedURLs) > 0 {
		if b, err := json.Marshal(failedURLs); err == nil {
			s := string(b)
			failedFeedsJSON = &s
		}
	}

	_, _ = i.store.UpdateImportJob(ctx, store.UpdateImportJobParams{
		ID:             jobID,
		Status:         status,
		ProcessedFeeds: int64(processed),
		FailedFeeds:    failedFeedsJSON,
	})

	i.logger.InfoContext(ctx, "finished OPML import job", "job_id", jobID, "status", status)
}

func (i *OPMLImporter) importOne(ctx context.Context, opmlFeed OpmlFeed) error {
	// Deduplication
	_, err := i.store.GetFeedByURL(ctx, opmlFeed.URL)
	if err == nil {
		// Already exists
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("db error checking feed existence: %w", err)
	}

	// Fetch
	fetchedFeed, err := i.fetcher.Fetch(ctx, opmlFeed.URL)
	if err != nil {
		return fmt.Errorf("failed to fetch feed: %w", err)
	}

	newUUID, err := i.uuidGen.NewRandom()
	if err != nil {
		return fmt.Errorf("failed to generate UUID: %w", err)
	}
	feedID := newUUID.String()

	strPtr := func(s string) *string {
		if s == "" {
			return nil
		}
		return &s
	}

	var imageUrl *string
	if fetchedFeed.Image != nil {
		imageUrl = strPtr(fetchedFeed.Image.URL)
	}

	title := fetchedFeed.Title
	if opmlFeed.Title != "" {
		title = opmlFeed.Title
	}

	// Submit to write queue
	i.writeQueue.Submit(&CreateFeedJob{
		Params: store.CreateFeedParams{
			ID:          feedID,
			Url:         opmlFeed.URL,
			Title:       strPtr(title),
			Description: strPtr(fetchedFeed.Description),
			Link:        strPtr(fetchedFeed.Link),
			Lang:        strPtr(fetchedFeed.Language),
			ImageUrl:    imageUrl,
			Copyright:   strPtr(fetchedFeed.Copyright),
			FeedType:    strPtr(fetchedFeed.FeedType),
			FeedVersion: strPtr(fetchedFeed.FeedVersion),
		},
	})

	return nil
}

func (i *OPMLImporter) GetImportJob(ctx context.Context, id string) (*feedv1.ImportJob, error) {
	job, err := i.store.GetImportJob(ctx, id)
	if err != nil {
		return nil, err
	}

	var status feedv1.ImportJobStatus
	switch job.Status {
	case "queued":
		status = feedv1.ImportJobStatus_IMPORT_JOB_STATUS_QUEUED
	case "processing":
		status = feedv1.ImportJobStatus_IMPORT_JOB_STATUS_PROCESSING
	case "completed":
		status = feedv1.ImportJobStatus_IMPORT_JOB_STATUS_COMPLETED
	case "failed":
		status = feedv1.ImportJobStatus_IMPORT_JOB_STATUS_FAILED
	default:
		status = feedv1.ImportJobStatus_IMPORT_JOB_STATUS_UNSPECIFIED
	}

	var failedFeeds []string
	if job.FailedFeeds != nil {
		_ = json.Unmarshal([]byte(*job.FailedFeeds), &failedFeeds)
	}

	return &feedv1.ImportJob{
		Id:             job.ID,
		Status:         status,
		TotalFeeds:     int32(job.TotalFeeds),
		ProcessedFeeds: int32(job.ProcessedFeeds),
		FailedFeeds:    failedFeeds,
		CreatedAt:      job.CreatedAt,
		UpdatedAt:      job.UpdatedAt,
	}, nil
}

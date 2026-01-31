package main

import (
	"log/slog"

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



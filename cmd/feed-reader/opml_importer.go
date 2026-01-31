package main

import (
	"log/slog"

	"github.com/nakatanakatana/feed-reader/store"
)


type OPMLImporter struct {
	store   *store.Store
	fetcher FeedFetcher
	logger  *slog.Logger
	uuidGen UUIDGenerator
}

func NewOPMLImporter(s *store.Store, f FeedFetcher, l *slog.Logger, uuidGen UUIDGenerator) *OPMLImporter {
	if uuidGen == nil {
		uuidGen = realUUIDGenerator{}
	}
	return &OPMLImporter{
		store:   s,
		fetcher: f,
		logger:  l,
		uuidGen: uuidGen,
	}
}



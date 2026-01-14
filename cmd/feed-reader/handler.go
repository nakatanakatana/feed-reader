package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"connectrpc.com/connect"
	feedv1 "github.com/nakatanakatana/feed-reader/gen/go/feed/v1"
	"github.com/nakatanakatana/feed-reader/gen/go/feed/v1/feedv1connect"
	"github.com/nakatanakatana/feed-reader/store"
)

type FeedServer struct {
	queries       *store.Queries
	uuidGenerator UUIDGenerator
	fetcher       FeedFetcher
}

func NewFeedServer(queries *store.Queries, uuidGen UUIDGenerator, fetcher FeedFetcher) feedv1connect.FeedServiceHandler {
	if uuidGen == nil {
		uuidGen = realUUIDGenerator{}
	}
	return &FeedServer{
		queries:       queries,
		uuidGenerator: uuidGen,
		fetcher:       fetcher,
	}
}

func (s *FeedServer) GetFeed(ctx context.Context, req *connect.Request[feedv1.GetFeedRequest]) (*connect.Response[feedv1.GetFeedResponse], error) {
	feed, err := s.queries.GetFeed(ctx, req.Msg.Uuid)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.GetFeedResponse{
		Feed: toProtoFeed(feed),
	}), nil
}

func (s *FeedServer) ListFeeds(ctx context.Context, req *connect.Request[feedv1.ListFeedsRequest]) (*connect.Response[feedv1.ListFeedsResponse], error) {
	feeds, err := s.queries.ListFeeds(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoFeeds := make([]*feedv1.Feed, len(feeds))
	for i, f := range feeds {
		protoFeeds[i] = toProtoFeed(f)
	}

	return connect.NewResponse(&feedv1.ListFeedsResponse{
		Feeds: protoFeeds,
	}), nil
}

func (s *FeedServer) CreateFeed(ctx context.Context, req *connect.Request[feedv1.CreateFeedRequest]) (*connect.Response[feedv1.CreateFeedResponse], error) {
	newUUID, err := s.uuidGenerator.NewRandom()
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to generate UUID: %w", err))
	}
	id := newUUID.String()

	feed, err := s.queries.CreateFeed(ctx, store.CreateFeedParams{
		Uuid:        id,
		Url:         req.Msg.Url,
		Title:       req.Msg.Title,
		Description: req.Msg.Description,
		Link:        req.Msg.Link,
		Language:    req.Msg.Language,
		ImageUrl:    req.Msg.ImageUrl,
		Copyright:   req.Msg.Copyright,
		FeedType:    req.Msg.FeedType,
		FeedVersion: req.Msg.FeedVersion,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.CreateFeedResponse{
		Feed: toProtoFeed(feed),
	}), nil
}

func (s *FeedServer) UpdateFeed(ctx context.Context, req *connect.Request[feedv1.UpdateFeedRequest]) (*connect.Response[feedv1.UpdateFeedResponse], error) {
	feed, err := s.queries.UpdateFeed(ctx, store.UpdateFeedParams{
		Link:          req.Msg.Link,
		Title:         req.Msg.Title,
		Description:   req.Msg.Description,
		Language:      req.Msg.Language,
		ImageUrl:      req.Msg.ImageUrl,
		Copyright:     req.Msg.Copyright,
		FeedType:      req.Msg.FeedType,
		FeedVersion:   req.Msg.FeedVersion,
		LastFetchedAt: req.Msg.LastFetchedAt,
		Uuid:          req.Msg.Uuid,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.UpdateFeedResponse{
		Feed: toProtoFeed(feed),
	}), nil
}

func (s *FeedServer) DeleteFeed(ctx context.Context, req *connect.Request[feedv1.DeleteFeedRequest]) (*connect.Response[feedv1.DeleteFeedResponse], error) {
	if err := s.queries.DeleteFeed(ctx, req.Msg.Uuid); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.DeleteFeedResponse{}), nil
}

func toProtoFeed(f store.Feed) *feedv1.Feed {
	// sqlite store uses strings for timestamps, need to confirm format if parsing required,
	// but proto also uses string for now based on previous decision.
	// If we wanted Timestamp, we'd parse time.RFC3339 or similar here.

	var title string
	if f.Title != nil {
		title = *f.Title
	}

	return &feedv1.Feed{
		Uuid:          f.Uuid,
		Url:           f.Url,
		Link:          f.Link,
		Title:         title,
		Description:   f.Description,
		Language:      f.Language,
		ImageUrl:      f.ImageUrl,
		Copyright:     f.Copyright,
		FeedType:      f.FeedType,
		FeedVersion:   f.FeedVersion,
		LastFetchedAt: f.LastFetchedAt,
		CreatedAt:     f.CreatedAt, // Assuming string format matches
		UpdatedAt:     f.UpdatedAt, // Assuming string format matches
	}
}

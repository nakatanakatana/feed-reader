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
	fetchedFeed, err := s.fetcher.Fetch(ctx, req.Msg.Url)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to fetch feed: %w", err))
	}

	newUUID, err := s.uuidGenerator.NewRandom()
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to generate UUID: %w", err))
	}
	id := newUUID.String()

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

	feed, err := s.queries.CreateFeed(ctx, store.CreateFeedParams{
		Uuid:        id,
		Url:         req.Msg.Url,
		Title:       strPtr(fetchedFeed.Title),
		Description: strPtr(fetchedFeed.Description),
		Link:        strPtr(fetchedFeed.Link),
		Language:    strPtr(fetchedFeed.Language),
		ImageUrl:    imageUrl,
		Copyright:   strPtr(fetchedFeed.Copyright),
		FeedType:    strPtr(fetchedFeed.FeedType),
		FeedVersion: strPtr(fetchedFeed.FeedVersion),
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

func (s *FeedServer) ListGlobalItems(ctx context.Context, req *connect.Request[feedv1.ListGlobalItemsRequest]) (*connect.Response[feedv1.ListGlobalItemsResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("not implemented"))
}

func (s *FeedServer) ListFeedItems(ctx context.Context, req *connect.Request[feedv1.ListFeedItemsRequest]) (*connect.Response[feedv1.ListFeedItemsResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("not implemented"))
}

func (s *FeedServer) GetItem(ctx context.Context, req *connect.Request[feedv1.GetItemRequest]) (*connect.Response[feedv1.GetItemResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("not implemented"))
}

func (s *FeedServer) MarkItemRead(ctx context.Context, req *connect.Request[feedv1.MarkItemReadRequest]) (*connect.Response[feedv1.MarkItemReadResponse], error) {
	// Check if item exists (and is linked to a feed)
	if _, err := s.queries.GetItem(ctx, req.Msg.Id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("item not found: %w", err))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	_, err := s.queries.MarkItemRead(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.MarkItemReadResponse{}), nil
}

func toProtoFeed(f store.Feed) *feedv1.Feed {
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
		CreatedAt:     f.CreatedAt,
		UpdatedAt:     f.UpdatedAt,
	}
}
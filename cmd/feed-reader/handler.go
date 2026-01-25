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
	store         *store.Store
	uuidGenerator UUIDGenerator
	fetcher       FeedFetcher
	itemFetcher   ItemFetcher
}

type ItemFetcher interface {
	FetchAndSave(ctx context.Context, f store.Feed) error
	FetchFeedsByIDs(ctx context.Context, uuids []string) error
}

func NewFeedServer(s *store.Store, uuidGen UUIDGenerator, fetcher FeedFetcher, itemFetcher ItemFetcher) feedv1connect.FeedServiceHandler {
	if uuidGen == nil {
		uuidGen = realUUIDGenerator{}
	}
	return &FeedServer{
		store:         s,
		uuidGenerator: uuidGen,
		fetcher:       fetcher,
		itemFetcher:   itemFetcher,
	}
}

func (s *FeedServer) GetFeed(ctx context.Context, req *connect.Request[feedv1.GetFeedRequest]) (*connect.Response[feedv1.GetFeedResponse], error) {
	feed, err := s.store.GetFeed(ctx, req.Msg.Uuid)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoFeed, err := s.toProtoFeed(ctx, feed)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.GetFeedResponse{
		Feed: protoFeed,
	}), nil
}

func (s *FeedServer) ListFeeds(ctx context.Context, req *connect.Request[feedv1.ListFeedsRequest]) (*connect.Response[feedv1.ListFeedsResponse], error) {
	var tagID interface{}
	if req.Msg.TagId != nil {
		tagID = *req.Msg.TagId
	}

	feeds, err := s.store.ListFeeds(ctx, tagID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoFeeds := make([]*feedv1.Feed, len(feeds))
	for i, f := range feeds {
		pf, err := s.toProtoFeed(ctx, f)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		protoFeeds[i] = pf
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

	feed, err := s.store.CreateFeed(ctx, store.CreateFeedParams{
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

	if len(req.Msg.TagIds) > 0 {
		if err := s.store.SetFeedTags(ctx, feed.Uuid, req.Msg.TagIds); err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}

	// Trigger immediate fetch of items
	_ = s.itemFetcher.FetchAndSave(ctx, feed)

	protoFeed, err := s.toProtoFeed(ctx, feed)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.CreateFeedResponse{
		Feed: protoFeed,
	}), nil
}

func (s *FeedServer) UpdateFeed(ctx context.Context, req *connect.Request[feedv1.UpdateFeedRequest]) (*connect.Response[feedv1.UpdateFeedResponse], error) {
	feed, err := s.store.UpdateFeed(ctx, store.UpdateFeedParams{
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

	if req.Msg.TagIds != nil {
		if err := s.store.SetFeedTags(ctx, feed.Uuid, req.Msg.TagIds); err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}

	protoFeed, err := s.toProtoFeed(ctx, feed)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.UpdateFeedResponse{
		Feed: protoFeed,
	}), nil
}

func (s *FeedServer) DeleteFeed(ctx context.Context, req *connect.Request[feedv1.DeleteFeedRequest]) (*connect.Response[feedv1.DeleteFeedResponse], error) {
	if err := s.store.DeleteFeed(ctx, req.Msg.Uuid); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.DeleteFeedResponse{}), nil
}

func (s *FeedServer) RefreshFeeds(ctx context.Context, req *connect.Request[feedv1.RefreshFeedsRequest]) (*connect.Response[feedv1.RefreshFeedsResponse], error) {
	if len(req.Msg.Uuids) == 0 {
		return connect.NewResponse(&feedv1.RefreshFeedsResponse{}), nil
	}

	if err := s.itemFetcher.FetchFeedsByIDs(ctx, req.Msg.Uuids); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.RefreshFeedsResponse{}), nil
}

func (s *FeedServer) CreateTag(ctx context.Context, req *connect.Request[feedv1.CreateTagRequest]) (*connect.Response[feedv1.CreateTagResponse], error) {
	newUUID, err := s.uuidGenerator.NewRandom()
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to generate UUID: %w", err))
	}

	tag, err := s.store.CreateTag(ctx, store.CreateTagParams{
		ID:   newUUID.String(),
		Name: req.Msg.Name,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.CreateTagResponse{
		Tag: toProtoTag(tag),
	}), nil
}

func (s *FeedServer) ListTags(ctx context.Context, req *connect.Request[feedv1.ListTagsRequest]) (*connect.Response[feedv1.ListTagsResponse], error) {
	tags, err := s.store.ListTags(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoTags := make([]*feedv1.Tag, len(tags))
	for i, t := range tags {
		protoTags[i] = toProtoTag(t)
	}

	return connect.NewResponse(&feedv1.ListTagsResponse{
		Tags: protoTags,
	}), nil
}

func (s *FeedServer) DeleteTag(ctx context.Context, req *connect.Request[feedv1.DeleteTagRequest]) (*connect.Response[feedv1.DeleteTagResponse], error) {
	if err := s.store.DeleteTag(ctx, req.Msg.Id); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.DeleteTagResponse{}), nil
}

func (s *FeedServer) SetFeedTags(ctx context.Context, req *connect.Request[feedv1.SetFeedTagsRequest]) (*connect.Response[feedv1.SetFeedTagsResponse], error) {
	if err := s.store.SetFeedTags(ctx, req.Msg.FeedId, req.Msg.TagIds); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.SetFeedTagsResponse{}), nil
}

func (s *FeedServer) toProtoFeed(ctx context.Context, f store.Feed) (*feedv1.Feed, error) {
	var title string
	if f.Title != nil {
		title = *f.Title
	}

	tags, err := s.store.ListTagsByFeedId(ctx, f.Uuid)
	if err != nil {
		return nil, err
	}

	protoTags := make([]*feedv1.Tag, len(tags))
	for i, t := range tags {
		protoTags[i] = toProtoTag(t)
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
		Tags:          protoTags,
	}, nil
}

func toProtoTag(t store.Tag) *feedv1.Tag {
	return &feedv1.Tag{
		Id:        t.ID,
		Name:      t.Name,
		CreatedAt: t.CreatedAt,
		UpdatedAt: t.UpdatedAt,
	}
}
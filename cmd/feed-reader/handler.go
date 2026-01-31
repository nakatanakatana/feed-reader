package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"connectrpc.com/connect"
	feedv1 "github.com/nakatanakatana/feed-reader/gen/go/feed/v1"
	"github.com/nakatanakatana/feed-reader/gen/go/feed/v1/feedv1connect"
	tagv1 "github.com/nakatanakatana/feed-reader/gen/go/tag/v1"
	"github.com/nakatanakatana/feed-reader/store"
)

type FeedServer struct {
	store         *store.Store
	uuidGenerator UUIDGenerator
	fetcher       FeedFetcher
	itemFetcher   ItemFetcher
	opmlImporter  *OPMLImporter
}

type ItemFetcher interface {
	FetchAndSave(ctx context.Context, f store.Feed) error
	FetchFeedsByIDs(ctx context.Context, ids []string) error
	FetchFeedsByIDsSync(ctx context.Context, ids []string) ([]FeedFetchResult, error)
}

func NewFeedServer(s *store.Store, uuidGen UUIDGenerator, fetcher FeedFetcher, itemFetcher ItemFetcher, opmlImporter *OPMLImporter) feedv1connect.FeedServiceHandler {
	if uuidGen == nil {
		uuidGen = realUUIDGenerator{}
	}
	return &FeedServer{
		store:         s,
		uuidGenerator: uuidGen,
		fetcher:       fetcher,
		itemFetcher:   itemFetcher,
		opmlImporter:  opmlImporter,
	}
}

func (s *FeedServer) GetFeed(ctx context.Context, req *connect.Request[feedv1.GetFeedRequest]) (*connect.Response[feedv1.GetFeedResponse], error) {
	feed, err := s.store.GetFeed(ctx, req.Msg.Id)
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

	feeds, err := s.store.ListFeeds(ctx, store.ListFeedsParams{
		TagID: tagID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Fetch unread counts
	counts, err := s.store.CountUnreadItemsPerFeed(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	countsMap := make(map[string]int64)
	for _, c := range counts {
		countsMap[c.FeedID] = c.Count
	}

	protoFeeds := make([]*feedv1.ListFeed, len(feeds))
	for i, f := range feeds {
		var title string
		if f.Title != nil {
			title = *f.Title
		}
		protoFeeds[i] = &feedv1.ListFeed{
			Id:          f.ID,
			Url:         f.Url,
			Title:       title,
			UnreadCount: countsMap[f.ID],
		}
	}

	return connect.NewResponse(&feedv1.ListFeedsResponse{
		Feeds: protoFeeds,
	}), nil
}

func (s *FeedServer) CreateFeed(ctx context.Context, req *connect.Request[feedv1.CreateFeedRequest]) (*connect.Response[feedv1.CreateFeedResponse], error) {
	feed, err := s.createFeedFromURL(ctx, req.Msg.Url, req.Msg.Title, req.Msg.TagIds)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	f, err := s.toProtoFeed(ctx, *feed)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.CreateFeedResponse{
		Feed: f,
	}), nil
}

func (s *FeedServer) createFeedFromURL(ctx context.Context, url string, titleOverride *string, tagIds []string) (*store.Feed, error) {
	fetchedFeed, err := s.fetcher.Fetch(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch feed: %w", err)
	}

	newUUID, err := s.uuidGenerator.NewRandom()
	if err != nil {
		return nil, fmt.Errorf("failed to generate UUID: %w", err)
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

	// Use override if provided, else fetched title
	title := fetchedFeed.Title
	if titleOverride != nil && *titleOverride != "" {
		title = *titleOverride
	}

	feed, err := s.store.CreateFeed(ctx, store.CreateFeedParams{
		ID:          id,
		Url:         url,
		Title:       strPtr(title),
		Description: strPtr(fetchedFeed.Description),
		Link:        strPtr(fetchedFeed.Link),
		Lang:        strPtr(fetchedFeed.Language),
		ImageUrl:    imageUrl,
		Copyright:   strPtr(fetchedFeed.Copyright),
		FeedType:    strPtr(fetchedFeed.FeedType),
		FeedVersion: strPtr(fetchedFeed.FeedVersion),
	})
	if err != nil {
		return nil, err
	}

	if len(tagIds) > 0 {
		if err := s.store.SetFeedTags(ctx, feed.ID, tagIds); err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}

	// Trigger immediate fetch of items
	_ = s.itemFetcher.FetchAndSave(ctx, feed)

	return &feed, nil
}

func (s *FeedServer) UpdateFeed(ctx context.Context, req *connect.Request[feedv1.UpdateFeedRequest]) (*connect.Response[feedv1.UpdateFeedResponse], error) {
	feed, err := s.store.UpdateFeed(ctx, store.UpdateFeedParams{
		Link:          req.Msg.Link,
		Title:         req.Msg.Title,
		Description:   req.Msg.Description,
		Lang:          req.Msg.Lang,
		ImageUrl:      req.Msg.ImageUrl,
		Copyright:     req.Msg.Copyright,
		FeedType:      req.Msg.FeedType,
		FeedVersion:   req.Msg.FeedVersion,
		LastFetchedAt: req.Msg.LastFetchedAt,
		ID:            req.Msg.Id,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	if req.Msg.TagIds != nil {
		if err := s.store.SetFeedTags(ctx, feed.ID, req.Msg.TagIds); err != nil {
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
	if err := s.store.DeleteFeed(ctx, req.Msg.Id); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.DeleteFeedResponse{}), nil
}

func (s *FeedServer) RefreshFeeds(ctx context.Context, req *connect.Request[feedv1.RefreshFeedsRequest]) (*connect.Response[feedv1.RefreshFeedsResponse], error) {
	if len(req.Msg.Ids) == 0 {
		return connect.NewResponse(&feedv1.RefreshFeedsResponse{}), nil
	}

	results, err := s.itemFetcher.FetchFeedsByIDsSync(ctx, req.Msg.Ids)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoResults := make([]*feedv1.FeedFetchStatus, len(results))
	for i, r := range results {
		status := &feedv1.FeedFetchStatus{
			FeedId:        r.FeedID,
			Success:       r.Success,
			NewItemsCount: r.NewItemsCount,
		}
		if r.ErrorMessage != "" {
			status.ErrorMessage = &r.ErrorMessage
		}
		protoResults[i] = status
	}

	return connect.NewResponse(&feedv1.RefreshFeedsResponse{
		Results: protoResults,
	}), nil
}

func (s *FeedServer) ImportOpml(ctx context.Context, req *connect.Request[feedv1.ImportOpmlRequest]) (*connect.Response[feedv1.ImportOpmlResponse], error) {
	jobID, err := s.opmlImporter.StartImportJob(ctx, req.Msg.OpmlContent)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.ImportOpmlResponse{
		JobId: jobID,
	}), nil
}

func (s *FeedServer) GetImportJob(ctx context.Context, req *connect.Request[feedv1.GetImportJobRequest]) (*connect.Response[feedv1.GetImportJobResponse], error) {
	job, err := s.opmlImporter.GetImportJob(ctx, req.Msg.Id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.GetImportJobResponse{
		Job: job,
	}), nil
}

func (s *FeedServer) SetFeedTags(ctx context.Context, req *connect.Request[feedv1.SetFeedTagsRequest]) (*connect.Response[feedv1.SetFeedTagsResponse], error) {
	if err := s.store.SetFeedTags(ctx, req.Msg.FeedId, req.Msg.TagIds); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.SetFeedTagsResponse{}), nil
}

func (s *FeedServer) ManageFeedTags(ctx context.Context, req *connect.Request[feedv1.ManageFeedTagsRequest]) (*connect.Response[feedv1.ManageFeedTagsResponse], error) {
	if err := s.store.ManageFeedTags(ctx, req.Msg.FeedIds, req.Msg.AddTagIds, req.Msg.RemoveTagIds); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&feedv1.ManageFeedTagsResponse{}), nil
}

func (s *FeedServer) toProtoFeed(ctx context.Context, f store.Feed) (*feedv1.Feed, error) {
	var title string
	if f.Title != nil {
		title = *f.Title
	}

	tags, err := s.store.ListTagsByFeedId(ctx, f.ID)
	if err != nil {
		return nil, err
	}

	protoTags := make([]*tagv1.Tag, len(tags))
	for i, t := range tags {
		protoTags[i] = &tagv1.Tag{
			Id:        t.ID,
			Name:      t.Name,
			CreatedAt: t.CreatedAt,
			UpdatedAt: t.UpdatedAt,
		}
	}

	return &feedv1.Feed{
		Id:            f.ID,
		Url:           f.Url,
		Link:          f.Link,
		Title:         title,
		Description:   f.Description,
		Lang:          f.Lang,
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

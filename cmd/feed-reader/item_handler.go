package main

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"connectrpc.com/connect"
	"github.com/nakatanakatana/feed-reader/gen/go/item/v1"
	"github.com/nakatanakatana/feed-reader/gen/go/item/v1/itemv1connect"
	"github.com/nakatanakatana/feed-reader/store"
)

type ItemServer struct {
	store *store.Store
}

func NewItemServer(s *store.Store) itemv1connect.ItemServiceHandler {
	return &ItemServer{store: s}
}

func (s *ItemServer) GetItem(ctx context.Context, req *connect.Request[itemv1.GetItemRequest]) (*connect.Response[itemv1.GetItemResponse], error) {
	item, err := s.store.GetItemWithAuthors(ctx, req.Msg.Id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&itemv1.GetItemResponse{
		Item: toProtoItem(item),
	}), nil
}

func (s *ItemServer) ListItems(ctx context.Context, req *connect.Request[itemv1.ListItemsRequest]) (*connect.Response[itemv1.ListItemsResponse], error) {
	limit := int64(req.Msg.Limit)
	if limit <= 0 {
		limit = 100
	}
	offset := int64(req.Msg.Offset)

	var feedID interface{}
	if req.Msg.FeedId != nil {
		feedID = *req.Msg.FeedId
	}
	var isRead interface{}
	if req.Msg.IsRead != nil {
		if *req.Msg.IsRead {
			isRead = int64(1)
		} else {
			isRead = int64(0)
		}
	}
	var tagID interface{}
	if req.Msg.TagId != nil {
		tagID = *req.Msg.TagId
	}
	var since interface{}
	if req.Msg.Since != nil {
		since = req.Msg.Since.AsTime().UTC().Format(time.RFC3339)
	}

	var totalCount int64
	var err error

	items, totalCount, err := s.store.ListItemsWithAuthors(ctx, store.ListItemsWithAuthorsParams{
		FeedID: feedID,
		IsRead: isRead,
		TagID:  tagID,
		Since:  since,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoItems := make([]*itemv1.ListItem, 0, len(items))
	for _, item := range items {
		protoItems = append(protoItems, toProtoListItem(item))
	}

	return connect.NewResponse(&itemv1.ListItemsResponse{
		Items:      protoItems,
		TotalCount: int32(totalCount),
	}), nil
}

func (s *ItemServer) UpdateItemStatus(ctx context.Context, req *connect.Request[itemv1.UpdateItemStatusRequest]) (*connect.Response[itemv1.UpdateItemStatusResponse], error) {
	err := s.store.WithTransaction(ctx, func(qtx *store.Queries) error {
		now := time.Now().Format(time.RFC3339)

		for _, id := range req.Msg.Ids {
			if req.Msg.IsRead != nil {
				isRead := int64(0)
				if *req.Msg.IsRead {
					isRead = 1
				}
				_, err := qtx.SetItemRead(ctx, store.SetItemReadParams{
					ItemID: id,
					IsRead: isRead,
					ReadAt: &now,
				})
				if err != nil {
					return err
				}
			}
		}
		return nil
	})

	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&itemv1.UpdateItemStatusResponse{}), nil
}

func (s *ItemServer) ListItemFeeds(ctx context.Context, req *connect.Request[itemv1.ListItemFeedsRequest]) (*connect.Response[itemv1.ListItemFeedsResponse], error) {
	rows, err := s.store.ListItemFeeds(ctx, req.Msg.ItemId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoFeeds := make([]*itemv1.ItemFeed, len(rows))
	for i, row := range rows {
		protoFeeds[i] = &itemv1.ItemFeed{
			FeedId:      row.FeedID,
			FeedTitle:   row.FeedTitle,
			PublishedAt: row.PublishedAt,
			CreatedAt:   row.CreatedAt,
		}
	}

	return connect.NewResponse(&itemv1.ListItemFeedsResponse{
		Feeds: protoFeeds,
	}), nil
}

func toProtoItem(item store.ItemWithAuthors) *itemv1.Item {
	var title string
	if item.Title != nil {
		title = *item.Title
	}
	var desc string
	if item.Description != nil {
		desc = *item.Description
	}
	var pubAt string
	if item.PublishedAt != nil {
		pubAt = *item.PublishedAt
	}
	var content string
	if item.Content != nil {
		content = *item.Content
	}
	var img string
	if item.ImageUrl != nil {
		img = *item.ImageUrl
	}
	var cats string
	if item.Categories != nil {
		cats = *item.Categories
	}

	protoAuthors := make([]*itemv1.Author, len(item.Authors))
	for i, a := range item.Authors {
		author := &itemv1.Author{
			Name: a.Name,
		}
		if a.Email != "" {
			author.Email = &a.Email
		}
		if a.Uri != "" {
			author.Uri = &a.Uri
		}
		protoAuthors[i] = author
	}

	return &itemv1.Item{
		Id:          item.ID,
		Url:         item.Url,
		Title:       title,
		Description: desc,
		PublishedAt: pubAt,
		FeedId:      item.FeedID,
		IsRead:      item.IsRead,
		Content:     content,
		ImageUrl:    img,
		Categories:  cats,
		CreatedAt:   item.CreatedAt,
		Authors:     protoAuthors,
	}
}

func toProtoListItem(item store.ItemWithAuthors) *itemv1.ListItem {
	var title string
	if item.Title != nil {
		title = *item.Title
	}
	var desc string
	if item.Description != nil {
		desc = *item.Description
	}
	var pubAt string
	if item.PublishedAt != nil {
		pubAt = *item.PublishedAt
	}

	return &itemv1.ListItem{
		Id:          item.ID,
		Title:       title,
		Description: desc,
		PublishedAt: pubAt,
		CreatedAt:   item.CreatedAt,
		IsRead:      item.IsRead,
		FeedId:      item.FeedID,
		Url:         item.Url,
	}
}

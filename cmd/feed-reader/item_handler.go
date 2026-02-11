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
	item, err := s.store.GetItem(ctx, req.Msg.Id)
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

	totalCount, err = s.store.CountItems(ctx, store.CountItemsParams{
		FeedID: feedID,
		IsRead: isRead,
		TagID:  tagID,
		Since:  since,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	rows, err := s.store.ListItems(ctx, store.ListItemsParams{
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

	protoItems := make([]*itemv1.ListItem, 0, len(rows))
	for _, row := range rows {
		protoItems = append(protoItems, toProtoListItem(GetItemRowFromListItemsRow(row)))
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

func GetItemRowFromListItemsRow(row store.ListItemsRow) store.GetItemRow {
	return store.GetItemRow{
		ID:          row.ID,
		Url:         row.Url,
		Title:       row.Title,
		Description: &row.Description,
		PublishedAt: row.PublishedAt,
		Author:      row.Author,
		Guid:        row.Guid,
		Content:     row.Content,
		ImageUrl:    row.ImageUrl,
		Categories:  row.Categories,
		CreatedAt:   row.CreatedAt,
		FeedID:      row.FeedID,
		IsRead:      row.IsRead,
	}
}

func toProtoItem(row store.GetItemRow) *itemv1.Item {
	var title string
	if row.Title != nil {
		title = *row.Title
	}
	var desc string
	if row.Description != nil {
		desc = *row.Description
	}
	var pubAt string
	if row.PublishedAt != nil {
		pubAt = *row.PublishedAt
	}
	var author string
	if row.Author != nil {
		author = *row.Author
	}
	var content string
	if row.Content != nil {
		content = *row.Content
	}
	var img string
	if row.ImageUrl != nil {
		img = *row.ImageUrl
	}
	var cats string
	if row.Categories != nil {
		cats = *row.Categories
	}

	return &itemv1.Item{
		Id:          row.ID,
		Url:         row.Url,
		Title:       title,
		Description: desc,
		PublishedAt: pubAt,
		Author:      author,
		FeedId:      row.FeedID,
		IsRead:      row.IsRead == 1,
		Content:     content,
		ImageUrl:    img,
		Categories:  cats,
		CreatedAt:   row.CreatedAt,
	}
}

func toProtoListItem(row store.GetItemRow) *itemv1.ListItem {
	var title string
	if row.Title != nil {
		title = *row.Title
	}
	var desc string
	if row.Description != nil {
		desc = *row.Description
	}
	var pubAt string
	if row.PublishedAt != nil {
		pubAt = *row.PublishedAt
	}

	return &itemv1.ListItem{
		Id:          row.ID,
		Title:       title,
		Description: desc,
		PublishedAt: pubAt,
		CreatedAt:   row.CreatedAt,
		IsRead:      row.IsRead == 1,
		FeedId:      row.FeedID,
		Url:         row.Url,
	}
}

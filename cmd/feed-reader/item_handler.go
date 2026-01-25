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
		limit = 20
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
	var isSaved interface{}
	if req.Msg.IsSaved != nil {
		if *req.Msg.IsSaved {
			isSaved = int64(1)
		} else {
			isSaved = int64(0)
		}
	}
	var tagID interface{}
	if req.Msg.TagId != nil {
		tagID = *req.Msg.TagId
	}

	var totalCount int64
	var err error

	totalCount, err = s.store.CountItems(ctx, store.CountItemsParams{
		FeedID:  feedID,
		IsRead:  isRead,
		IsSaved: isSaved,
		TagID:   tagID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoItems := []*itemv1.Item{}

	if req.Msg.SortOrder == itemv1.ListItemsRequest_SORT_ORDER_ASC {
		rows, err := s.store.ListItemsAsc(ctx, store.ListItemsAscParams{
			FeedID:  feedID,
			IsRead:  isRead,
			IsSaved: isSaved,
			TagID:   tagID,
			Limit:   limit,
			Offset:  offset,
		})
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		for _, row := range rows {
			protoItems = append(protoItems, toProtoItem(GetItemRowFromListItemsAscRow(row)))
		}
	} else {
		rows, err := s.store.ListItems(ctx, store.ListItemsParams{
			FeedID:  feedID,
			IsRead:  isRead,
			IsSaved: isSaved,
			TagID:   tagID,
			Limit:   limit,
			Offset:  offset,
		})
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		for _, row := range rows {
			protoItems = append(protoItems, toProtoItem(GetItemRowFromListItemsRow(row)))
		}
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
			if req.Msg.IsSaved != nil {
				isSaved := int64(0)
				if *req.Msg.IsSaved {
					isSaved = 1
				}
				_, err := qtx.SetItemSaved(ctx, store.SetItemSavedParams{
					ItemID:  id,
					IsSaved: isSaved,
					SavedAt: &now,
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
	return store.GetItemRow(row)
}

func GetItemRowFromListItemsAscRow(row store.ListItemsAscRow) store.GetItemRow {
	return store.GetItemRow(row)
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

	return &itemv1.Item{
		Id:          row.ID,
		Url:         row.Url,
		Title:       title,
		Description: desc,
		PublishedAt: pubAt,
		Author:      author,
		FeedId:      row.FeedID,
		IsRead:      row.IsRead == 1,
		IsSaved:     row.IsSaved == 1,
	}
}

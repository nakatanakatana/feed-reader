package store

import (
	"context"
	"errors"
)

type StoreListItemsParams struct {
	FeedID          interface{}
	IsRead          interface{}
	TagID           interface{}
	Since           interface{}
	CreatedAtCursor interface{}
	IDCursor        interface{}
	Limit           int64
	IsBlocked       interface{}
}

func (s *Store) ListItems(ctx context.Context, params StoreListItemsParams) ([]ListItemsRow, error) {
	arg := ListItemsParams{
		FeedID:          params.FeedID,
		IsRead:          params.IsRead,
		TagID:           params.TagID,
		Since:           params.Since,
		CreatedAtCursor: params.CreatedAtCursor,
		IDCursor:        params.IDCursor,
		Limit:           params.Limit,
		IsBlocked:       params.IsBlocked,
	}
	return s.Queries.ListItems(ctx, arg)
}

type StoreCountItemsParams struct {
	FeedID    interface{}
	IsRead    interface{}
	TagID     interface{}
	Since     interface{}
	IsBlocked interface{}
}

func (s *Store) CountItems(ctx context.Context, params StoreCountItemsParams) (int64, error) {
	return s.Queries.CountItems(ctx, CountItemsParams(params))
}

func (s *Store) GetItem(ctx context.Context, id string) (GetItemRow, error) {
	return s.Queries.GetItem(ctx, id)
}

func (s *Store) ListItemRead(ctx context.Context, params ListItemReadParams) ([]ListItemReadRow, error) {
	if (params.UpdatedAtCursor != nil && params.ItemIDCursor == nil) || (params.UpdatedAtCursor == nil && params.ItemIDCursor != nil) {
		return nil, errors.New("both UpdatedAtCursor and ItemIDCursor must be provided together for pagination")
	}
	return s.Queries.ListItemRead(ctx, params)
}

package store

import (
	"context"
)

type StoreListItemsParams struct {
	FeedID    interface{}
	IsRead    interface{}
	TagID     interface{}
	Since     interface{}
	Offset    int64
	Limit     int64
	IsBlocked interface{}
}

func (s *Store) ListItems(ctx context.Context, params StoreListItemsParams) ([]ListItemsRow, error) {
	arg := ListItemsParams{
		FeedID:    params.FeedID,
		IsRead:    params.IsRead,
		TagID:     params.TagID,
		Since:     params.Since,
		Offset:    params.Offset,
		Limit:     params.Limit,
		IsBlocked: params.IsBlocked,
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
	arg := CountItemsParams{
		FeedID:    params.FeedID,
		IsRead:    params.IsRead,
		TagID:     params.TagID,
		Since:     params.Since,
		IsBlocked: params.IsBlocked,
	}
	return s.Queries.CountItems(ctx, arg)
}

func (s *Store) GetItem(ctx context.Context, id string) (GetItemRow, error) {
	return s.Queries.GetItem(ctx, id)
}

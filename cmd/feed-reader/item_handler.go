package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"connectrpc.com/connect"
	"github.com/nakatanakatana/feed-reader/gen/go/item/v1"
	"github.com/nakatanakatana/feed-reader/gen/go/item/v1/itemv1connect"
	"github.com/nakatanakatana/feed-reader/store"
)

type ItemServer struct {
	store         *store.Store
	uuidGenerator UUIDGenerator
}

func NewItemServer(s *store.Store, uuidGen UUIDGenerator) itemv1connect.ItemServiceHandler {
	if uuidGen == nil {
		uuidGen = realUUIDGenerator{}
	}
	return &ItemServer{
		store:         s,
		uuidGenerator: uuidGen,
	}
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

	var feedID any
	if req.Msg.FeedId != nil {
		feedID = *req.Msg.FeedId
	}
	var isRead any
	if req.Msg.IsRead != nil {
		if *req.Msg.IsRead {
			isRead = int64(1)
		} else {
			isRead = int64(0)
		}
	}
	var tagID any
	if req.Msg.TagId != nil {
		tagID = *req.Msg.TagId
	}
	var since any
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

func (s *ItemServer) AddURLParsingRule(ctx context.Context, req *connect.Request[itemv1.AddURLParsingRuleRequest]) (*connect.Response[itemv1.AddURLParsingRuleResponse], error) {
	newUUID, err := s.uuidGenerator.NewRandom()
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to generate UUID: %w", err))
	}

	rule, err := s.store.CreateURLParsingRule(ctx, store.CreateURLParsingRuleParams{
		ID:       newUUID.String(),
		Domain:   req.Msg.Domain,
		RuleType: req.Msg.RuleType,
		Pattern:  req.Msg.Pattern,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&itemv1.AddURLParsingRuleResponse{
		Rule: &itemv1.URLParsingRule{
			Id:       rule.ID,
			Domain:   rule.Domain,
			RuleType: rule.RuleType,
			Pattern:  rule.Pattern,
		},
	}), nil
}

func (s *ItemServer) DeleteURLParsingRule(ctx context.Context, req *connect.Request[itemv1.DeleteURLParsingRuleRequest]) (*connect.Response[itemv1.DeleteURLParsingRuleResponse], error) {
	if err := s.store.DeleteURLParsingRule(ctx, req.Msg.Id); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&itemv1.DeleteURLParsingRuleResponse{}), nil
}

func (s *ItemServer) ListURLParsingRules(ctx context.Context, req *connect.Request[itemv1.ListURLParsingRulesRequest]) (*connect.Response[itemv1.ListURLParsingRulesResponse], error) {
	rules, err := s.store.ListURLParsingRules(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoRules := make([]*itemv1.URLParsingRule, len(rules))
	for i, rule := range rules {
		protoRules[i] = &itemv1.URLParsingRule{
			Id:       rule.ID,
			Domain:   rule.Domain,
			RuleType: rule.RuleType,
			Pattern:  rule.Pattern,
		}
	}

	return connect.NewResponse(&itemv1.ListURLParsingRulesResponse{
		Rules: protoRules,
	}), nil
}

func (s *ItemServer) AddItemBlockRules(ctx context.Context, req *connect.Request[itemv1.AddItemBlockRulesRequest]) (*connect.Response[itemv1.AddItemBlockRulesResponse], error) {
	params := make([]store.CreateItemBlockRuleParams, len(req.Msg.Rules))
	for i, r := range req.Msg.Rules {
		newUUID, err := s.uuidGenerator.NewRandom()
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to generate UUID: %w", err))
		}
		params[i] = store.CreateItemBlockRuleParams{
			ID:        newUUID.String(),
			RuleType:  r.RuleType,
			RuleValue: r.Value,
			Domain:    r.Domain,
		}
	}

	if err := s.store.CreateItemBlockRules(ctx, params); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Trigger scanning of existing items for these new rules
	go func() {
		// Create a background context for the scanning process
		ctx := context.Background()

		// 1. Fetch all URL parsing rules
		urlRules, err := s.store.ListURLParsingRules(ctx)
		if err != nil {
			return
		}
		parser := NewURLParser(urlRules)

		// 2. Fetch all items
		items, err := s.store.ListItemsForBlocking(ctx)
		if err != nil {
			return
		}

		// 3. Pre-extract info for all items to avoid redundant parsing
		extractedInfoMap := make(map[string]store.ExtractedUserInfo)
		for _, item := range items {
			if info := parser.ExtractUserInfo(item.Url); info != nil {
				extractedInfoMap[item.Url] = *info
			}
		}

		// 4. For each new rule, populate blocks
		for _, p := range params {
			rule := store.ItemBlockRule{
				ID:        p.ID,
				RuleType:  p.RuleType,
				RuleValue: p.RuleValue,
				Domain:    p.Domain,
			}
			_ = s.store.PopulateItemBlocksForRule(ctx, rule, extractedInfoMap)
		}
	}()

	return connect.NewResponse(&itemv1.AddItemBlockRulesResponse{}), nil
}

func (s *ItemServer) DeleteItemBlockRule(ctx context.Context, req *connect.Request[itemv1.DeleteItemBlockRuleRequest]) (*connect.Response[itemv1.DeleteItemBlockRuleResponse], error) {
	if err := s.store.DeleteItemBlockRule(ctx, req.Msg.Id); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&itemv1.DeleteItemBlockRuleResponse{}), nil
}

func (s *ItemServer) ListItemBlockRules(ctx context.Context, req *connect.Request[itemv1.ListItemBlockRulesRequest]) (*connect.Response[itemv1.ListItemBlockRulesResponse], error) {
	rules, err := s.store.ListItemBlockRules(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoRules := make([]*itemv1.ItemBlockRule, len(rules))
	for i, rule := range rules {
		protoRules[i] = &itemv1.ItemBlockRule{
			Id:       rule.ID,
			RuleType: rule.RuleType,
			Value:    rule.RuleValue,
			Domain:   rule.Domain,
		}
	}

	return connect.NewResponse(&itemv1.ListItemBlockRulesResponse{
		Rules: protoRules,
	}), nil
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

package main

import (
	"context"
	"fmt"

	"connectrpc.com/connect"
	tagv1 "github.com/nakatanakatana/feed-reader/gen/go/tag/v1"
	"github.com/nakatanakatana/feed-reader/gen/go/tag/v1/tagv1connect"
	"github.com/nakatanakatana/feed-reader/store"
)

type TagServer struct {
	store         *store.Store
	uuidGenerator UUIDGenerator
}

func NewTagServer(s *store.Store, uuidGen UUIDGenerator) tagv1connect.TagServiceHandler {
	if uuidGen == nil {
		uuidGen = realUUIDGenerator{}
	}
	return &TagServer{
		store:         s,
		uuidGenerator: uuidGen,
	}
}

func (s *TagServer) CreateTag(ctx context.Context, req *connect.Request[tagv1.CreateTagRequest]) (*connect.Response[tagv1.CreateTagResponse], error) {
	newUUID, err := s.uuidGenerator.NewRandom()
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to generate UUID: %w", err))
	}

	dbTag, err := s.store.CreateTag(ctx, store.CreateTagParams{
		ID:   newUUID.String(),
		Name: req.Msg.Name,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	tag := store.TagWithCount{
		ID:        dbTag.ID,
		Name:      dbTag.Name,
		CreatedAt: dbTag.CreatedAt,
		UpdatedAt: dbTag.UpdatedAt,
	}

	return connect.NewResponse(&tagv1.CreateTagResponse{
		Tag: toProtoTagV1(tag),
	}), nil
}

func (s *TagServer) ListTags(ctx context.Context, req *connect.Request[tagv1.ListTagsRequest]) (*connect.Response[tagv1.ListTagsResponse], error) {
	tags, err := s.store.ListTags(ctx, store.ListTagsParams{})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	totalUnread, err := s.store.CountTotalUnreadItems(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoTags := make([]*tagv1.ListTag, len(tags))
	for i, t := range tags {
		protoTags[i] = &tagv1.ListTag{
			Id:          t.ID,
			Name:        t.Name,
			UnreadCount: t.UnreadCount,
		}
	}

	return connect.NewResponse(&tagv1.ListTagsResponse{
		Tags:             protoTags,
		TotalUnreadCount: totalUnread,
	}), nil
}

func (s *TagServer) DeleteTag(ctx context.Context, req *connect.Request[tagv1.DeleteTagRequest]) (*connect.Response[tagv1.DeleteTagResponse], error) {
	if err := s.store.DeleteTag(ctx, req.Msg.Id); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&tagv1.DeleteTagResponse{}), nil
}

func toProtoTagV1(t store.TagWithCount) *tagv1.Tag {
	return &tagv1.Tag{
		Id:          t.ID,
		Name:        t.Name,
		CreatedAt:   t.CreatedAt,
		UpdatedAt:   t.UpdatedAt,
		UnreadCount: t.UnreadCount,
	}
}

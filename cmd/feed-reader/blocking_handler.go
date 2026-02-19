package main

import (
	"context"

	"connectrpc.com/connect"
	blockingv1 "github.com/nakatanakatana/feed-reader/gen/go/blocking/v1"
	"github.com/nakatanakatana/feed-reader/gen/go/blocking/v1/blockingv1connect"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/google/uuid"
)

type BlockingServer struct {
	store             *store.Store
	backgroundService *BlockingBackgroundService
	pool              *WorkerPool
}

func NewBlockingServer(s *store.Store, bg *BlockingBackgroundService, p *WorkerPool) blockingv1connect.BlockingServiceHandler {
	return &BlockingServer{
		store:             s,
		backgroundService: bg,
		pool:              p,
	}
}

func (s *BlockingServer) triggerReevaluation() {
	if s.pool != nil {
		s.pool.AddTask(func(ctx context.Context) error {
			return s.backgroundService.ReevaluateAll(ctx)
		})
	}
}

func (s *BlockingServer) CreateBlockingRule(ctx context.Context, req *connect.Request[blockingv1.CreateBlockingRuleRequest]) (*connect.Response[blockingv1.CreateBlockingRuleResponse], error) {
	rule, err := s.store.CreateBlockingRule(ctx, store.CreateBlockingRuleParams{
		ID:       uuid.NewString(),
		RuleType: req.Msg.RuleType,
		Username: req.Msg.Username,
		Domain:   req.Msg.Domain,
		Keyword:  req.Msg.Keyword,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	s.triggerReevaluation()

	return connect.NewResponse(&blockingv1.CreateBlockingRuleResponse{
		Rule: s.toProtoBlockingRule(rule),
	}), nil
}

func (s *BlockingServer) ListBlockingRules(ctx context.Context, req *connect.Request[blockingv1.ListBlockingRulesRequest]) (*connect.Response[blockingv1.ListBlockingRulesResponse], error) {
	rules, err := s.store.ListBlockingRules(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoRules := make([]*blockingv1.BlockingRule, len(rules))
	for i, r := range rules {
		protoRules[i] = s.toProtoBlockingRule(r)
	}

	return connect.NewResponse(&blockingv1.ListBlockingRulesResponse{
		Rules: protoRules,
	}), nil
}

func (s *BlockingServer) DeleteBlockingRule(ctx context.Context, req *connect.Request[blockingv1.DeleteBlockingRuleRequest]) (*connect.Response[blockingv1.DeleteBlockingRuleResponse], error) {
	if err := s.store.DeleteBlockingRule(ctx, req.Msg.Id); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	s.triggerReevaluation()

	return connect.NewResponse(&blockingv1.DeleteBlockingRuleResponse{}), nil
}

func (s *BlockingServer) CreateURLParsingRule(ctx context.Context, req *connect.Request[blockingv1.CreateURLParsingRuleRequest]) (*connect.Response[blockingv1.CreateURLParsingRuleResponse], error) {
	rule, err := s.store.CreateURLParsingRule(ctx, store.CreateURLParsingRuleParams{
		ID:      uuid.NewString(),
		Domain:  req.Msg.Domain,
		Pattern: req.Msg.Pattern,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	s.triggerReevaluation()

	return connect.NewResponse(&blockingv1.CreateURLParsingRuleResponse{
		Rule: s.toProtoURLParsingRule(rule),
	}), nil
}

func (s *BlockingServer) ListURLParsingRules(ctx context.Context, req *connect.Request[blockingv1.ListURLParsingRulesRequest]) (*connect.Response[blockingv1.ListURLParsingRulesResponse], error) {
	rules, err := s.store.ListURLParsingRules(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoRules := make([]*blockingv1.URLParsingRule, len(rules))
	for i, r := range rules {
		protoRules[i] = s.toProtoURLParsingRule(r)
	}

	return connect.NewResponse(&blockingv1.ListURLParsingRulesResponse{
		Rules: protoRules,
	}), nil
}

func (s *BlockingServer) DeleteURLParsingRule(ctx context.Context, req *connect.Request[blockingv1.DeleteURLParsingRuleRequest]) (*connect.Response[blockingv1.DeleteURLParsingRuleResponse], error) {
	if err := s.store.DeleteURLParsingRule(ctx, req.Msg.Id); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	s.triggerReevaluation()

	return connect.NewResponse(&blockingv1.DeleteURLParsingRuleResponse{}), nil
}

func (s *BlockingServer) ReevaluateAllItems(ctx context.Context, req *connect.Request[blockingv1.ReevaluateAllItemsRequest]) (*connect.Response[blockingv1.ReevaluateAllItemsResponse], error) {
	s.triggerReevaluation()
	return connect.NewResponse(&blockingv1.ReevaluateAllItemsResponse{}), nil
}

func (s *BlockingServer) toProtoBlockingRule(r store.BlockingRule) *blockingv1.BlockingRule {
	return &blockingv1.BlockingRule{
		Id:        r.ID,
		RuleType:  r.RuleType,
		Username:  r.Username,
		Domain:    r.Domain,
		Keyword:   r.Keyword,
		CreatedAt: r.CreatedAt,
		UpdatedAt: r.UpdatedAt,
	}
}

func (s *BlockingServer) toProtoURLParsingRule(r store.UrlParsingRule) *blockingv1.URLParsingRule {
	return &blockingv1.URLParsingRule{
		Id:        r.ID,
		Domain:    r.Domain,
		Pattern:   r.Pattern,
		CreatedAt: r.CreatedAt,
		UpdatedAt: r.UpdatedAt,
	}
}

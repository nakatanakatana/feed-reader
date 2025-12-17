package main

import (
	"context"
	"database/sql"
	"errors"
	"testing"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
	feedv1 "github.com/nakatanakatana/feed-reader/gen/go/feed/v1"
	"github.com/nakatanakatana/feed-reader/gen/go/feed/v1/feedv1connect"
	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
)

func setupTestDB(t *testing.T) *store.Queries {
	t.Helper()
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("failed to open db: %v", err)
	}

	if _, err := db.Exec(schema.Schema); err != nil {
		t.Fatalf("failed to apply schema: %v", err)
	}

	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Fatalf("failed to close db in cleanup: %v", err)
		}
	})

	return store.New(db)
}

type mockUUIDGenerator struct {
	err error
}

func (m mockUUIDGenerator) NewRandom() (uuid.UUID, error) {
	if m.err != nil {
		return uuid.UUID{}, m.err
	}
	return uuid.NewRandom()
}

func TestFeedServer_CreateFeed(t *testing.T) {
	ctx := context.Background()

	type args struct {
		req *feedv1.CreateFeedRequest
	}
	tests := []struct {
		name    string
		args    args
		uuidErr error
		wantErr bool
		errCode connect.Code
	}{
		{
			name: "Success",
			args: args{
				req: &feedv1.CreateFeedRequest{
					Url:   "https://example.com/rss",
					Title: "Test Feed",
				},
			},
			wantErr: false,
		},
		{
			name: "UUID Generation Error",
			args: args{
				req: &feedv1.CreateFeedRequest{
					Url:   "https://example.com/err",
					Title: "Error Feed",
				},
			},
			uuidErr: errors.New("uuid error"),
			wantErr: true,
			errCode: connect.CodeInternal,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			queries := setupTestDB(t)
			server := NewFeedServer(queries, mockUUIDGenerator{err: tt.uuidErr})

			res, err := server.CreateFeed(ctx, connect.NewRequest(tt.args.req))
			if (err != nil) != tt.wantErr {
				t.Errorf("CreateFeed() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr {
				if connect.CodeOf(err) != tt.errCode {
					t.Errorf("CreateFeed() error code = %v, want %v", connect.CodeOf(err), tt.errCode)
				}
				return
			}

			if res.Msg.Feed.Uuid == "" {
				t.Error("expected non-empty uuid")
			}
			if res.Msg.Feed.Url != tt.args.req.Url {
				t.Errorf("expected url %s, got %s", tt.args.req.Url, res.Msg.Feed.Url)
			}
			if res.Msg.Feed.Title != tt.args.req.Title {
				t.Errorf("expected title %s, got %s", tt.args.req.Title, res.Msg.Feed.Title)
			}
		})
	}
}

func TestFeedServer_GetFeed(t *testing.T) {
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T, server feedv1connect.FeedServiceHandler) string
		uuid    string
		wantErr bool
		errCode connect.Code
	}{
		{
			name: "Success",
			setup: func(t *testing.T, server feedv1connect.FeedServiceHandler) string {
				res, err := server.CreateFeed(ctx, connect.NewRequest(&feedv1.CreateFeedRequest{
					Url:   "https://example.com/get",
					Title: "Get Feed",
				}))
				if err != nil {
					t.Fatalf("setup failed: %v", err)
				}
				return res.Msg.Feed.Uuid
			},
			wantErr: false,
		},
		{
			name: "NotFound",
			setup: func(t *testing.T, server feedv1connect.FeedServiceHandler) string {
				return "00000000-0000-0000-0000-000000000000"
			},
			wantErr: true,
			errCode: connect.CodeNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			queries := setupTestDB(t)
			server := NewFeedServer(queries, nil)
			uuid := tt.setup(t, server)

			_, err := server.GetFeed(ctx, connect.NewRequest(&feedv1.GetFeedRequest{Uuid: uuid}))
			if (err != nil) != tt.wantErr {
				t.Errorf("GetFeed() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr {
				if connect.CodeOf(err) != tt.errCode {
					t.Errorf("GetFeed() error code = %v, want %v", connect.CodeOf(err), tt.errCode)
				}
			}
		})
	}
}

func TestFeedServer_ListFeeds(t *testing.T) {
	ctx := context.Background()

	tests := []struct {
		name      string
		setup     func(t *testing.T, server feedv1connect.FeedServiceHandler)
		wantCount int
	}{
		{
			name: "List 3 feeds",
			setup: func(t *testing.T, server feedv1connect.FeedServiceHandler) {
				for i := 0; i < 3; i++ {
					_, err := server.CreateFeed(ctx, connect.NewRequest(&feedv1.CreateFeedRequest{
						Url:   "https://example.com/list-" + string(rune('a'+i)),
						Title: "Feed " + string(rune('a'+i)),
					}))
					if err != nil {
						t.Fatalf("setup failed: %v", err)
					}
				}
			},
			wantCount: 3,
		},
		{
			name:      "List empty",
			setup:     func(t *testing.T, server feedv1connect.FeedServiceHandler) {},
			wantCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			queries := setupTestDB(t)
			server := NewFeedServer(queries, nil)
			tt.setup(t, server)

			res, err := server.ListFeeds(ctx, connect.NewRequest(&feedv1.ListFeedsRequest{}))
			if err != nil {
				t.Fatalf("ListFeeds() error = %v", err)
			}
			if len(res.Msg.Feeds) != tt.wantCount {
				t.Errorf("ListFeeds() count = %d, want %d", len(res.Msg.Feeds), tt.wantCount)
			}
		})
	}
}

func TestFeedServer_UpdateFeed(t *testing.T) {
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T, server feedv1connect.FeedServiceHandler) *feedv1.UpdateFeedRequest
		wantErr bool
		errCode connect.Code
	}{
		{
			name: "Success",
			setup: func(t *testing.T, server feedv1connect.FeedServiceHandler) *feedv1.UpdateFeedRequest {
				res, err := server.CreateFeed(ctx, connect.NewRequest(&feedv1.CreateFeedRequest{
					Url:   "https://example.com/update",
					Title: "Original",
				}))
				if err != nil {
					t.Fatalf("setup failed: %v", err)
				}
				feed := res.Msg.Feed
				return &feedv1.UpdateFeedRequest{
					Uuid:  feed.Uuid,
					Url:   feed.Url,
					Title: "Updated",
				}
			},
			wantErr: false,
		},
		{
			name: "NotFound",
			setup: func(t *testing.T, server feedv1connect.FeedServiceHandler) *feedv1.UpdateFeedRequest {
				return &feedv1.UpdateFeedRequest{
					Uuid:  "00000000-0000-0000-0000-000000000000",
					Url:   "http://example.com",
					Title: "Updated",
				}
			},
			wantErr: true,
			errCode: connect.CodeNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			queries := setupTestDB(t)
			server := NewFeedServer(queries, nil)
			req := tt.setup(t, server)

			_, err := server.UpdateFeed(ctx, connect.NewRequest(req))
			if (err != nil) != tt.wantErr {
				t.Errorf("UpdateFeed() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr {
				if connect.CodeOf(err) != tt.errCode {
					t.Errorf("UpdateFeed() error code = %v, want %v", connect.CodeOf(err), tt.errCode)
				}
			}
		})
	}
}

func TestFeedServer_DeleteFeed(t *testing.T) {
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T, server feedv1connect.FeedServiceHandler) string
		wantErr bool
	}{
		{
			name: "Success",
			setup: func(t *testing.T, server feedv1connect.FeedServiceHandler) string {
				res, err := server.CreateFeed(ctx, connect.NewRequest(&feedv1.CreateFeedRequest{
					Url:   "https://example.com/delete",
					Title: "Delete Me",
				}))
				if err != nil {
					t.Fatalf("setup failed: %v", err)
				}
				return res.Msg.Feed.Uuid
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			queries := setupTestDB(t)
			server := NewFeedServer(queries, nil)
			uuid := tt.setup(t, server)

			_, err := server.DeleteFeed(ctx, connect.NewRequest(&feedv1.DeleteFeedRequest{Uuid: uuid}))
			if (err != nil) != tt.wantErr {
				t.Errorf("DeleteFeed() error = %v, wantErr %v", err, tt.wantErr)
			}

			// Verify deletion
			if !tt.wantErr {
				_, err := server.GetFeed(ctx, connect.NewRequest(&feedv1.GetFeedRequest{Uuid: uuid}))
				if connect.CodeOf(err) != connect.CodeNotFound {
					t.Errorf("GetFeed() after DeleteFeed() code = %v, want CodeNotFound", connect.CodeOf(err))
				}
			}
		})
	}
}

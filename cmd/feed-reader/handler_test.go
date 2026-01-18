package main

import (
	"context"
	"database/sql"
	"errors"
	"testing"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
	"google.golang.org/protobuf/proto"

	"github.com/mmcdole/gofeed"
	"github.com/nakatanakatana/feed-reader/gen/go/feed/v1"
	"github.com/nakatanakatana/feed-reader/gen/go/feed/v1/feedv1connect"
	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
)

func setupTestDB(t *testing.T) (*store.Queries, *sql.DB) {
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

	return store.New(db), db
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

type mockFetcher struct {
	feed *gofeed.Feed
	err  error
}

func (m *mockFetcher) Fetch(ctx context.Context, url string) (*gofeed.Feed, error) {
	if m.err != nil {
		return nil, m.err
	}
	if m.feed == nil {
		return &gofeed.Feed{}, nil
	}
	return m.feed, nil
}

type mockItemFetcher struct {
	called bool
	err    error
}

func (m *mockItemFetcher) FetchAndSave(ctx context.Context, f store.Feed) error {
	m.called = true
	return m.err
}

func TestFeedServer_CreateFeed(t *testing.T) {
	ctx := context.Background()

	type args struct {
		req *feedv1.CreateFeedRequest
	}
	tests := []struct {
		name      string
		args      args
		uuidErr   error
		mockFeed  *gofeed.Feed
		fetchErr  error
		wantErr   bool
		errCode   connect.Code
		wantTitle string
		wantFetch bool
	}{
		{
			name: "Success",
			args: args{
				req: &feedv1.CreateFeedRequest{
					Url:   "https://example.com/rss",
					Title: proto.String("Test Feed"),
				},
			},
			mockFeed:  &gofeed.Feed{Title: "Fetched Title"},
			wantTitle: "Fetched Title",
			wantErr:   false,
			wantFetch: true,
		},
		{
			name: "UUID Generation Error",
			args: args{
				req: &feedv1.CreateFeedRequest{
					Url:   "https://example.com/err",
					Title: proto.String("Error Feed"),
				},
			},
			mockFeed: &gofeed.Feed{Title: "Fetched Title"},
			uuidErr:  errors.New("uuid error"),
			wantErr:  true,
			errCode:  connect.CodeInternal,
		},
		{
			name: "Fetch Error",
			args: args{
				req: &feedv1.CreateFeedRequest{
					Url: "https://example.com/fail",
				},
			},
			fetchErr: errors.New("fetch failed"),
			wantErr:  true,
			errCode:  connect.CodeInternal,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			queries, _ := setupTestDB(t)
			fetcher := &mockFetcher{feed: tt.mockFeed, err: tt.fetchErr}
			itemFetcher := &mockItemFetcher{}
			server := NewFeedServer(queries, mockUUIDGenerator{err: tt.uuidErr}, fetcher, itemFetcher)

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
			if tt.wantTitle != "" {
				if res.Msg.Feed.Title != tt.wantTitle {
					t.Errorf("expected title %s, got %s", tt.wantTitle, res.Msg.Feed.Title)
				}
			}

			if tt.wantFetch && !itemFetcher.called {
				t.Error("expected FetchAndSave to be called")
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
					Title: proto.String("Get Feed"),
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
			queries, _ := setupTestDB(t)
			server := NewFeedServer(queries, nil, &mockFetcher{}, &mockItemFetcher{})
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
				for i := range 3 {
					_, err := server.CreateFeed(ctx, connect.NewRequest(&feedv1.CreateFeedRequest{
						Url:   "https://example.com/list-" + string(rune('a'+i)),
						Title: proto.String("Feed " + string(rune('a'+i))),
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
			queries, _ := setupTestDB(t)
			server := NewFeedServer(queries, nil, &mockFetcher{}, &mockItemFetcher{})
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
					Title: proto.String("Original"),
				}))
				if err != nil {
					t.Fatalf("setup failed: %v", err)
				}
				feed := res.Msg.Feed
				return &feedv1.UpdateFeedRequest{
					Uuid:  feed.Uuid,
					Title: proto.String("Updated"),
				}
			},
			wantErr: false,
		},
		{
			name: "NotFound",
			setup: func(t *testing.T, server feedv1connect.FeedServiceHandler) *feedv1.UpdateFeedRequest {
				return &feedv1.UpdateFeedRequest{
					Uuid:  "00000000-0000-0000-0000-000000000000",
					Title: proto.String("Updated"),
				}
			},
			wantErr: true,
			errCode: connect.CodeNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			queries, _ := setupTestDB(t)
			server := NewFeedServer(queries, nil, &mockFetcher{}, &mockItemFetcher{})
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
					Title: proto.String("Delete Me"),
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
			queries, _ := setupTestDB(t)
			server := NewFeedServer(queries, nil, &mockFetcher{}, &mockItemFetcher{})
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
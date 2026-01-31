package main

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"testing"
	"time"


	"connectrpc.com/connect"
	"github.com/google/uuid"
	"google.golang.org/protobuf/proto"
	_ "modernc.org/sqlite"

	"github.com/mmcdole/gofeed"
	"github.com/nakatanakatana/feed-reader/gen/go/feed/v1"
	"github.com/nakatanakatana/feed-reader/gen/go/feed/v1/feedv1connect"
	"github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestDB(t *testing.T) (*store.Queries, *sql.DB) {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open db: %v", err)
	}

	// For in-memory SQLite, we must limit to a single connection to share the database across goroutines.
	db.SetMaxOpenConns(1)

	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		t.Fatalf("failed to enable foreign keys: %v", err)
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
	ids    []string
}

func (m *mockItemFetcher) FetchAndSave(ctx context.Context, f store.Feed) error {
	m.called = true
	return m.err
}

func (m *mockItemFetcher) FetchFeedsByIDs(ctx context.Context, ids []string) error {
	m.called = true
	m.ids = ids
	return m.err
}

func (m *mockItemFetcher) FetchFeedsByIDsSync(ctx context.Context, ids []string) ([]FeedFetchResult, error) {
	m.called = true
	m.ids = ids
	if m.err != nil {
		return nil, m.err
	}
	results := make([]FeedFetchResult, len(ids))
	for i, id := range ids {
		results[i] = FeedFetchResult{FeedID: id, Success: true}
	}
	return results, nil
}

func setupServer(t *testing.T, db *sql.DB, uuidErr error, fetcher FeedFetcher, itemFetcher ItemFetcher) (feedv1connect.FeedServiceHandler, *OPMLImporter) {
	s := store.NewStore(db)
	pool := NewWorkerPool(1)
	pool.Start(context.Background())
	t.Cleanup(pool.Wait)
	wq := NewWriteQueueService(s, WriteQueueConfig{MaxBatchSize: 1, FlushInterval: time.Millisecond}, slog.Default())
	go wq.Start(context.Background())
	importer := NewOPMLImporter(s, fetcher, slog.Default(), mockUUIDGenerator{err: uuidErr})
	return NewFeedServer(s, mockUUIDGenerator{err: uuidErr}, fetcher, itemFetcher, importer), importer
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
			wantTitle: "Test Feed",
			wantErr:   false,
			wantFetch: false,
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
			_, db := setupTestDB(t)
			fetcher := &mockFetcher{feed: tt.mockFeed, err: tt.fetchErr}
			itemFetcher := &mockItemFetcher{}
			server, _ := setupServer(t, db, tt.uuidErr, fetcher, itemFetcher)

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

			if res.Msg.Feed.Id == "" {
				t.Error("expected non-empty id")
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
			if !tt.wantFetch && itemFetcher.called {
				t.Error("expected FetchAndSave NOT to be called")
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
				return res.Msg.Feed.Id
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
			_, db := setupTestDB(t)
			server, _ := setupServer(t, db, nil, &mockFetcher{}, &mockItemFetcher{})
			id := tt.setup(t, server)

			_, err := server.GetFeed(ctx, connect.NewRequest(&feedv1.GetFeedRequest{Id: id}))
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
			_, db := setupTestDB(t)
			server, _ := setupServer(t, db, nil, &mockFetcher{}, &mockItemFetcher{})
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

func TestFeedServer_ListFeeds_UnreadCounts(t *testing.T) {
	ctx := context.Background()
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	server, _ := setupServer(t, db, nil, &mockFetcher{}, &mockItemFetcher{})

	// Feed 1
	f1, err := s.CreateFeed(ctx, store.CreateFeedParams{ID: "f1", Url: "u1", Title: proto.String("Feed 1")})
	require.NoError(t, err)

	// Feed 2
	f2, err := s.CreateFeed(ctx, store.CreateFeedParams{ID: "f2", Url: "u2", Title: proto.String("Feed 2")})
	require.NoError(t, err)

	// Items for F1: 1 unread, 1 read
	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{FeedID: f1.ID, Url: "i1-1", Title: proto.String("i1-1")}) // Unread by default
	require.NoError(t, err)
	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{FeedID: f1.ID, Url: "i1-2", Title: proto.String("i1-2")})
	require.NoError(t, err)

	// Mark i1-2 as read. Need ID.
	var id1_2 string
	err = db.QueryRow("SELECT id FROM items WHERE url = 'i1-2'").Scan(&id1_2)
	require.NoError(t, err)
	_, err = s.SetItemRead(ctx, store.SetItemReadParams{ItemID: id1_2, IsRead: 1})
	require.NoError(t, err)

	// Items for F2: 1 unread
	err = s.SaveFetchedItem(ctx, store.SaveFetchedItemParams{FeedID: f2.ID, Url: "i2-1", Title: proto.String("i2-1")})
	require.NoError(t, err)

	// List Feeds
	res, err := server.ListFeeds(ctx, connect.NewRequest(&feedv1.ListFeedsRequest{}))
	require.NoError(t, err)
	require.Len(t, res.Msg.Feeds, 2)

	// Check counts
	feedsMap := make(map[string]int64)
	for _, f := range res.Msg.Feeds {
		feedsMap[f.Id] = f.UnreadCount
	}

	assert.Equal(t, int64(1), feedsMap[f1.ID], "Feed 1 should have 1 unread")
	assert.Equal(t, int64(1), feedsMap[f2.ID], "Feed 2 should have 1 unread")
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
					Id:    feed.Id,
					Title: proto.String("Updated"),
				}
			},
			wantErr: false,
		},
		{
			name: "NotFound",
			setup: func(t *testing.T, server feedv1connect.FeedServiceHandler) *feedv1.UpdateFeedRequest {
				return &feedv1.UpdateFeedRequest{
					Id:    "00000000-0000-0000-0000-000000000000",
					Title: proto.String("Updated"),
				}
			},
			wantErr: true,
			errCode: connect.CodeNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, db := setupTestDB(t)
			server, _ := setupServer(t, db, nil, &mockFetcher{}, &mockItemFetcher{})
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
				return res.Msg.Feed.Id
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, db := setupTestDB(t)
			server, _ := setupServer(t, db, nil, &mockFetcher{}, &mockItemFetcher{})
			id := tt.setup(t, server)

			_, err := server.DeleteFeed(ctx, connect.NewRequest(&feedv1.DeleteFeedRequest{Id: id}))
			if (err != nil) != tt.wantErr {
				t.Errorf("DeleteFeed() error = %v, wantErr %v", err, tt.wantErr)
			}

			// Verify deletion
			if !tt.wantErr {
				_, err := server.GetFeed(ctx, connect.NewRequest(&feedv1.GetFeedRequest{Id: id}))
				if connect.CodeOf(err) != connect.CodeNotFound {
					t.Errorf("GetFeed() after DeleteFeed() code = %v, want CodeNotFound", connect.CodeOf(err))
				}
			}
		})
	}
}

func TestFeedServer_RefreshFeeds(t *testing.T) {
	ctx := context.Background()

	tests := []struct {
		name      string
		ids       []string
		fetchErr  error
		wantErr   bool
		errCode   connect.Code
		wantFetch bool
	}{
		{
			name:      "Success",
			ids:       []string{"uuid-1", "uuid-2"},
			wantErr:   false,
			wantFetch: true,
		},
		{
			name:      "Empty IDs",
			ids:       []string{},
			wantErr:   false,
			wantFetch: false,
		},
		{
			name:      "Fetch Error",
			ids:       []string{"uuid-1"},
			fetchErr:  errors.New("fetch error"),
			wantErr:   true,
			errCode:   connect.CodeInternal,
			wantFetch: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, db := setupTestDB(t)
			itemFetcher := &mockItemFetcher{err: tt.fetchErr}
			server, _ := setupServer(t, db, nil, &mockFetcher{}, itemFetcher)

			_, err := server.RefreshFeeds(ctx, connect.NewRequest(&feedv1.RefreshFeedsRequest{Ids: tt.ids}))
			if (err != nil) != tt.wantErr {
				t.Errorf("RefreshFeeds() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr {
				if connect.CodeOf(err) != tt.errCode {
					t.Errorf("RefreshFeeds() error code = %v, want %v", connect.CodeOf(err), tt.errCode)
				}
				return
			}

			if tt.wantFetch && !itemFetcher.called {
				t.Error("expected FetchFeedsByIDs to be called")
			}
			if tt.wantFetch && len(itemFetcher.ids) != len(tt.ids) {
				t.Errorf("expected %d ids, got %d", len(tt.ids), len(itemFetcher.ids))
			}
		})
	}
}



func TestFeedServer_ManageFeedTags(t *testing.T) {
	ctx := context.Background()
	_, db := setupTestDB(t)
	server, _ := setupServer(t, db, nil, &mockFetcher{}, &mockItemFetcher{})

	// Setup: 2 feeds and 2 tags
	f1Res, _ := server.CreateFeed(ctx, connect.NewRequest(&feedv1.CreateFeedRequest{Url: "u1", Title: proto.String("f1")}))
	f2Res, _ := server.CreateFeed(ctx, connect.NewRequest(&feedv1.CreateFeedRequest{Url: "u2", Title: proto.String("f2")}))

	// Assuming TagService is managed separately, but for handler test we can just use store directly to create tags
	q := store.New(db)
	_, _ = q.CreateTag(ctx, store.CreateTagParams{ID: "t1", Name: "Tag 1"})
	_, _ = q.CreateTag(ctx, store.CreateTagParams{ID: "t2", Name: "Tag 2"})

	// Initially f1, f2 have t1
	_ = q.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: f1Res.Msg.Feed.Id, TagID: "t1"})
	_ = q.CreateFeedTag(ctx, store.CreateFeedTagParams{FeedID: f2Res.Msg.Feed.Id, TagID: "t1"})

	t.Run("Bulk Manage Tags", func(t *testing.T) {
		req := &feedv1.ManageFeedTagsRequest{
			FeedIds:      []string{f1Res.Msg.Feed.Id, f2Res.Msg.Feed.Id},
			AddTagIds:    []string{"t2"},
			RemoveTagIds: []string{"t1"},
		}

		_, err := server.ManageFeedTags(ctx, connect.NewRequest(req))
		require.NoError(t, err)

		// Verify f1
		res1, _ := server.GetFeed(ctx, connect.NewRequest(&feedv1.GetFeedRequest{Id: f1Res.Msg.Feed.Id}))
		assert.Len(t, res1.Msg.Feed.Tags, 1)
		assert.Equal(t, "t2", res1.Msg.Feed.Tags[0].Id)

		// Verify f2
		res2, _ := server.GetFeed(ctx, connect.NewRequest(&feedv1.GetFeedRequest{Id: f2Res.Msg.Feed.Id}))
		assert.Len(t, res2.Msg.Feed.Tags, 1)
		assert.Equal(t, "t2", res2.Msg.Feed.Tags[0].Id)
	})
}

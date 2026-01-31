package main

import (
	"context"
	"database/sql"
	"errors"
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
			_, db := setupTestDB(t)
			fetcher := &mockFetcher{feed: tt.mockFeed, err: tt.fetchErr}
			itemFetcher := &mockItemFetcher{}
			server := NewFeedServer(store.NewStore(db), mockUUIDGenerator{err: tt.uuidErr}, fetcher, itemFetcher)

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
			server := NewFeedServer(store.NewStore(db), nil, &mockFetcher{}, &mockItemFetcher{})
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
			server := NewFeedServer(store.NewStore(db), nil, &mockFetcher{}, &mockItemFetcher{})
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
	server := NewFeedServer(s, nil, &mockFetcher{}, &mockItemFetcher{})

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
	feedsMap := make(map[string]*feedv1.Feed)
	for _, f := range res.Msg.Feeds {
		feedsMap[f.Id] = f
	}

	assert.Equal(t, int64(1), feedsMap[f1.ID].UnreadCount, "Feed 1 should have 1 unread")
	assert.Equal(t, int64(1), feedsMap[f2.ID].UnreadCount, "Feed 2 should have 1 unread")
}

func TestFeedServer_ListFeeds_LastFetchedAt(t *testing.T) {
	ctx := context.Background()
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	server := NewFeedServer(s, nil, &mockFetcher{}, &mockItemFetcher{})

	lastFetched := "2026-01-28T15:30:00Z"
	_, err := s.CreateFeed(ctx, store.CreateFeedParams{
		ID:    "f1",
		Url:   "u1",
		Title: proto.String("Feed 1"),
	})
	require.NoError(t, err)

	_, err = s.UpdateFeed(ctx, store.UpdateFeedParams{
		ID:            "f1",
		LastFetchedAt: &lastFetched,
	})
	require.NoError(t, err)

	res, err := server.ListFeeds(ctx, connect.NewRequest(&feedv1.ListFeedsRequest{}))
	require.NoError(t, err)
	require.Len(t, res.Msg.Feeds, 1)

	assert.Equal(t, &lastFetched, res.Msg.Feeds[0].LastFetchedAt)
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
			server := NewFeedServer(store.NewStore(db), nil, &mockFetcher{}, &mockItemFetcher{})
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
			server := NewFeedServer(store.NewStore(db), nil, &mockFetcher{}, &mockItemFetcher{})
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
			server := NewFeedServer(store.NewStore(db), nil, &mockFetcher{}, itemFetcher)

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

func TestFeedServer_ImportOpml(t *testing.T) {
	ctx := context.Background()

	opmlContent := `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
    <body>
        <outline text="Existing" xmlUrl="https://example.com/existing" />
        <outline text="New" xmlUrl="https://example.com/new" />
    </body>
</opml>`

	t.Run("Import with deduplication", func(t *testing.T) {
		queries, db := setupTestDB(t)
		// Pre-create existing feed
		existingID := "existing-uuid"
		_, err := queries.CreateFeed(ctx, store.CreateFeedParams{
			ID:    existingID,
			Url:   "https://example.com/existing",
			Title: func() *string { s := "Existing"; return &s }(),
		})
		if err != nil {
			t.Fatalf("failed to create existing feed: %v", err)
		}

		itemFetcher := &mockItemFetcher{}
		// Mock fetcher needs to return something for the NEW feed if we call Fetch() during CreateFeed.
		// Current implementation of CreateFeed calls fetcher.Fetch.
		// So ImportOpml will likely call CreateFeed or duplicated logic.
		// If it calls CreateFeed, we need mockFetcher to work.
		fetcher := &mockFetcher{
			feed: &gofeed.Feed{Title: "Fetched Title"},
		}

		server := NewFeedServer(store.NewStore(db), nil, fetcher, itemFetcher)

		req := &feedv1.ImportOpmlRequest{
			OpmlContent: []byte(opmlContent),
		}

		res, err := server.ImportOpml(ctx, connect.NewRequest(req))
		if err != nil {
			t.Fatalf("ImportOpml() error = %v", err)
		}

		if res.Msg.Total != 2 {
			t.Errorf("expected total 2, got %d", res.Msg.Total)
		}
		if res.Msg.Success != 1 {
			t.Errorf("expected success 1, got %d", res.Msg.Success)
		}
		if res.Msg.Skipped != 1 {
			t.Errorf("expected skipped 1, got %d", res.Msg.Skipped)
		}
		if len(res.Msg.FailedFeeds) != 0 {
			t.Errorf("expected 0 failed feeds, got %v", res.Msg.FailedFeeds)
		}

		// Verify DB
		feeds, err := queries.ListFeeds(ctx, nil)
		if err != nil {
			t.Fatalf("ListFeeds error: %v", err)
		}
		if len(feeds) != 2 {
			t.Errorf("expected 2 feeds in DB, got %d", len(feeds))
		}

		// Verify ItemFetcher called for new feed
		if !itemFetcher.called {
			t.Error("expected ItemFetcher to be called for new feed")
		}
	})

	t.Run("Import with fetch failure", func(t *testing.T) {
		_, db := setupTestDB(t)
		fetcher := &mockFetcher{
			err: errors.New("fetch failed"),
		}
		server := NewFeedServer(store.NewStore(db), nil, fetcher, &mockItemFetcher{})

		req := &feedv1.ImportOpmlRequest{
			OpmlContent: []byte(opmlContent),
		}

		res, err := server.ImportOpml(ctx, connect.NewRequest(req))
		if err != nil {
			t.Fatalf("ImportOpml() error = %v", err)
		}

		// Both are new. Both fail to fetch.
		if res.Msg.Total != 2 {
			t.Errorf("expected total 2, got %d", res.Msg.Total)
		}
		if res.Msg.Success != 0 {
			t.Errorf("expected success 0, got %d", res.Msg.Success)
		}
		if len(res.Msg.FailedFeeds) != 2 {
			t.Errorf("expected 2 failed feeds, got %d", len(res.Msg.FailedFeeds))
		}
	})

	t.Run("Import invalid OPML", func(t *testing.T) {
		_, db := setupTestDB(t)
		server := NewFeedServer(store.NewStore(db), nil, &mockFetcher{}, &mockItemFetcher{})

		req := &feedv1.ImportOpmlRequest{
			OpmlContent: []byte("invalid"),
		}

		_, err := server.ImportOpml(ctx, connect.NewRequest(req))
		if connect.CodeOf(err) != connect.CodeInvalidArgument {
			t.Errorf("expected CodeInvalidArgument, got %v", connect.CodeOf(err))
		}
	})
}

func TestFeedServer_ManageFeedTags(t *testing.T) {
	ctx := context.Background()
	_, db := setupTestDB(t)
	server := NewFeedServer(store.NewStore(db), nil, &mockFetcher{}, &mockItemFetcher{})

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

	t.Run("Store Error", func(t *testing.T) {
		req := &feedv1.ManageFeedTagsRequest{
			FeedIds:   []string{"non-existent"},
			AddTagIds: []string{"t2"},
		}
		_, err := server.ManageFeedTags(ctx, connect.NewRequest(req))
		assert.Error(t, err)
		assert.Equal(t, connect.CodeInternal, connect.CodeOf(err))
	})
}

func TestFeedServer_ListFeeds_Sorting(t *testing.T) {
	ctx := context.Background()

	setup := func(t *testing.T, server feedv1connect.FeedServiceHandler) (string, string) {
		// Feed 1
		res1, err := server.CreateFeed(ctx, connect.NewRequest(&feedv1.CreateFeedRequest{
			Url:   "http://example.com/f1",
			Title: proto.String("Feed 1"),
		}))
		require.NoError(t, err)

		time.Sleep(1100 * time.Millisecond)

		// Feed 2
		res2, err := server.CreateFeed(ctx, connect.NewRequest(&feedv1.CreateFeedRequest{
			Url:   "http://example.com/f2",
			Title: proto.String("Feed 2"),
		}))
		require.NoError(t, err)

		return res1.Msg.Feed.Id, res2.Msg.Feed.Id
	}

	t.Run("Sort Descending True", func(t *testing.T) {
		_, db := setupTestDB(t)
		server := NewFeedServer(store.NewStore(db), nil, &mockFetcher{}, &mockItemFetcher{})
		id1, id2 := setup(t, server)

		req := &feedv1.ListFeedsRequest{SortDescending: proto.Bool(true)}
		res, err := server.ListFeeds(ctx, connect.NewRequest(req))
		require.NoError(t, err)

		require.Len(t, res.Msg.Feeds, 2)
		assert.Equal(t, id2, res.Msg.Feeds[0].Id)
		assert.Equal(t, id1, res.Msg.Feeds[1].Id)
	})

	t.Run("Sort Descending False", func(t *testing.T) {
		_, db := setupTestDB(t)
		server := NewFeedServer(store.NewStore(db), nil, &mockFetcher{}, &mockItemFetcher{})
		id1, id2 := setup(t, server)

		req := &feedv1.ListFeedsRequest{SortDescending: proto.Bool(false)}
		res, err := server.ListFeeds(ctx, connect.NewRequest(req))
		require.NoError(t, err)

		require.Len(t, res.Msg.Feeds, 2)
		assert.Equal(t, id1, res.Msg.Feeds[0].Id)
		assert.Equal(t, id2, res.Msg.Feeds[1].Id)
	})
}

package httpapi_test

import (
	"io/fs"
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"github.com/nakatanakatana/feed-reader/internal/httpapi"
	"github.com/nakatanakatana/feed-reader/internal/primarydb"
	schema "github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func setupTestDB(t *testing.T) *store.Store {
	t.Helper()
	db, err := primarydb.OpenDB(":memory:")
	assert.NilError(t, err, "failed to open db")
	db.SetMaxOpenConns(1)
	_, err = db.Exec(schema.Schema)
	assert.NilError(t, err, "failed to apply schema")
	t.Cleanup(func() {
		assert.NilError(t, db.Close())
	})
	return store.NewStore(db)
}

func testAssets() fs.FS {
	return fstest.MapFS{
		"index.html": &fstest.MapFile{Data: []byte("ok")},
	}
}

func TestNewMux(t *testing.T) {
	testStore := setupTestDB(t)
	handler := httpapi.NewMux(httpapi.Dependencies{
		Store:  testStore,
		Assets: testAssets(),
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v2/feeds", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK, rec.Body.String())
}

func TestNewMux_CORSAllowedMethods(t *testing.T) {
	testStore := setupTestDB(t)
	const origin = "http://localhost:3000"

	t.Run("defaults to primary methods when AllowedMethods is empty", func(t *testing.T) {
		handler := httpapi.NewMux(httpapi.Dependencies{
			Store:          testStore,
			Assets:         testAssets(),
			AllowedOrigins: []string{origin},
		})

		req := httptest.NewRequest(http.MethodOptions, "/api/v2/feeds", nil)
		req.Header.Set("Origin", origin)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, rec.Code, http.StatusNoContent)
		assert.Equal(t, rec.Header().Get("Access-Control-Allow-Methods"), "GET, POST, OPTIONS, PUT, DELETE")
	})

	t.Run("uses AllowedMethods when set for readonly", func(t *testing.T) {
		handler := httpapi.NewMux(httpapi.Dependencies{
			Store:          testStore,
			Assets:         testAssets(),
			AllowedOrigins: []string{origin},
			AllowedMethods: "GET, HEAD, OPTIONS",
		})

		req := httptest.NewRequest(http.MethodOptions, "/api/v2/feeds", nil)
		req.Header.Set("Origin", origin)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, rec.Code, http.StatusNoContent)
		assert.Equal(t, rec.Header().Get("Access-Control-Allow-Methods"), "GET, HEAD, OPTIONS")
	})
}

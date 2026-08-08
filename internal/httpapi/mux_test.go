package httpapi_test

import (
	"io/fs"
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"github.com/nakatanakatana/feed-reader/internal/httpapi"
	schema "github.com/nakatanakatana/feed-reader/sql"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func setupTestDB(t *testing.T) *store.Store {
	t.Helper()
	db, err := store.OpenDB(":memory:")
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

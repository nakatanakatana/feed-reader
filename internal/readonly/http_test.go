package readonly_test

import (
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/nakatanakatana/feed-reader/internal/readonly"
	_ "modernc.org/sqlite"
	"gotest.tools/v3/assert"
)

func TestReadOnlyMiddleware(t *testing.T) {
	tests := []struct {
		name       string
		method     string
		wantCalled bool
		wantStatus int
		wantAllow  string
	}{
		{
			name:       "GET reaches next",
			method:     http.MethodGet,
			wantCalled: true,
			wantStatus: http.StatusOK,
		},
		{
			name:       "HEAD reaches next",
			method:     http.MethodHead,
			wantCalled: true,
			wantStatus: http.StatusOK,
		},
		{
			name:       "OPTIONS reaches next",
			method:     http.MethodOptions,
			wantCalled: true,
			wantStatus: http.StatusOK,
		},
		{
			name:       "POST is rejected",
			method:     http.MethodPost,
			wantCalled: false,
			wantStatus: http.StatusMethodNotAllowed,
			wantAllow:  "GET, HEAD, OPTIONS",
		},
		{
			name:       "PUT is rejected",
			method:     http.MethodPut,
			wantCalled: false,
			wantStatus: http.StatusMethodNotAllowed,
			wantAllow:  "GET, HEAD, OPTIONS",
		},
		{
			name:       "PATCH is rejected",
			method:     http.MethodPatch,
			wantCalled: false,
			wantStatus: http.StatusMethodNotAllowed,
			wantAllow:  "GET, HEAD, OPTIONS",
		},
		{
			name:       "DELETE is rejected",
			method:     http.MethodDelete,
			wantCalled: false,
			wantStatus: http.StatusMethodNotAllowed,
			wantAllow:  "GET, HEAD, OPTIONS",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			called := false
			spy := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				called = true
				w.WriteHeader(http.StatusOK)
			})

			handler := readonly.ReadOnlyMiddleware(spy)
			req := httptest.NewRequest(tt.method, "http://example.com/api/v2/feeds", nil)
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, req)

			assert.Equal(t, called, tt.wantCalled)
			assert.Equal(t, w.Code, tt.wantStatus)
			if !tt.wantCalled {
				assert.Equal(t, w.Header().Get("Allow"), tt.wantAllow)

				var body struct {
					Code    string `json:"code"`
					Message string `json:"message"`
				}
				assert.NilError(t, json.NewDecoder(w.Body).Decode(&body))
				assert.Equal(t, body.Code, "readonly")
				assert.Assert(t, body.Message != "")
			}
		})
	}
}

func TestReadinessHandler(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	assert.NilError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	handler := readonly.NewReadinessHandler(db)

	t.Run("returns 200 when SELECT 1 succeeds", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "http://example.com/readyz", nil)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)
		assert.Equal(t, w.Code, http.StatusOK)
	})

	t.Run("returns 503 after database is closed", func(t *testing.T) {
		assert.NilError(t, db.Close())
		req := httptest.NewRequest(http.MethodGet, "http://example.com/readyz", nil)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)
		assert.Equal(t, w.Code, http.StatusServiceUnavailable)
		body, err := io.ReadAll(w.Body)
		assert.NilError(t, err)
		assert.Assert(t, len(body) > 0)
	})
}

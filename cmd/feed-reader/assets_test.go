package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"gotest.tools/v3/assert"
	"gotest.tools/v3/assert/cmp"
)

func TestNewAssetsHandler(t *testing.T) {
	mockFS := fstest.MapFS{
		"dist/index.html":                {Data: []byte("index content")},
		"dist/assets/style.css":          {Data: []byte("css content")},
		"dist/assets/index-BLoa0RA4.css": {Data: []byte("css content")},
		"dist/data/file.txt":             {Data: []byte("data content")},
		"dist/nested/index.html":         {Data: []byte("nested index")},
	}

	handler := NewAssetsHandler(mockFS)

	tests := []struct {
		name           string
		path           string
		expectedStatus int
		expectedBody   string
	}{
		{
			name:           "Serve index.html",
			path:           "/",
			expectedStatus: http.StatusOK,
			expectedBody:   "index content",
		},
		{
			name:           "Serve existing asset",
			path:           "/assets/style.css",
			expectedStatus: http.StatusOK,
			expectedBody:   "css content",
		},
		{
			name:           "SPA Fallback for non-existent route",
			path:           "/feeds",
			expectedStatus: http.StatusOK,
			expectedBody:   "index content",
		},
		{
			name:           "SPA Fallback for non-existent nested route",
			path:           "/feeds/123",
			expectedStatus: http.StatusOK,
			expectedBody:   "index content",
		},
		{
			name:           "Static asset not found should still fallback to index.html",
			path:           "/assets/notfound.css",
			expectedStatus: http.StatusOK,
			expectedBody:   "index content",
		},
		{
			name:           "Request directory should fallback to index.html",
			path:           "/assets/",
			expectedStatus: http.StatusOK,
			expectedBody:   "index content",
		},
		{
			name:           "Request index.html directly",
			path:           "/index.html",
			expectedStatus: http.StatusOK,
			expectedBody:   "index content",
		},
		{
			name:           "Request nested directory should serve its index.html",
			path:           "/nested/",
			expectedStatus: http.StatusOK,
			expectedBody:   "nested index",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			rr := httptest.NewRecorder()

			handler.ServeHTTP(rr, req)

			assert.Equal(t, rr.Code, tt.expectedStatus)
			assert.Assert(t, cmp.Contains(rr.Body.String(), tt.expectedBody))
		})
	}
}

func TestAssetsHandler_NoIndex(t *testing.T) {
	mockFS := fstest.MapFS{
		"dist/other.txt": {Data: []byte("other")},
	}
	handler := NewAssetsHandler(mockFS)

	t.Run("Root fallback fails", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		assert.Equal(t, rr.Code, http.StatusNotFound)
	})

	t.Run("Non-existent file fallback fails", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/notfound", nil)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		assert.Equal(t, rr.Code, http.StatusNotFound)
	})
}

func TestNewAssetsHandler_NoSubDir(t *testing.T) {
	mockFS := fstest.MapFS{
		"index.html": {Data: []byte("root index")},
	}
	handler := NewAssetsHandler(mockFS)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	assert.Equal(t, rr.Code, http.StatusOK)
	assert.Assert(t, cmp.Contains(rr.Body.String(), "root index"))
}

package main

import (
	"io/fs"
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"github.com/stretchr/testify/assert"
)

func TestNewAssetsHandler(t *testing.T) {
	mockFS := fstest.MapFS{
		"frontend/dist/index.html":                {Data: []byte("index content")},
		"frontend/dist/assets/style.css":          {Data: []byte("css content")},
		"frontend/dist/assets/index-BLoa0RA4.css": {Data: []byte("css content")},
		"frontend/dist/data/file.txt":             {Data: []byte("data content")},
		"frontend/dist/nested/index.html":        {Data: []byte("nested index")},
		"frontend/dist/empty_dir/":                {Mode: 0755 | 020000000}, // Directory
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
		{
			name:           "Empty directory should fallback to root index.html",
			path:           "/empty_dir/",
			expectedStatus: http.StatusOK,
			expectedBody:   "index content",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			rr := httptest.NewRecorder()

			handler.ServeHTTP(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)
			assert.Contains(t, rr.Body.String(), tt.expectedBody)
		})
	}
}

func TestAssetsHandler_NoIndex(t *testing.T) {
	mockFS := fstest.MapFS{
		"frontend/dist/other.txt": {Data: []byte("other")},
	}
	handler := NewAssetsHandler(mockFS)

	t.Run("Root fallback fails", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	t.Run("Non-existent file fallback fails", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/notfound", nil)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		assert.Equal(t, http.StatusNotFound, rr.Code)
	})
	
	t.Run("Directory fallback fails", func(t *testing.T) {
		mockFS := fstest.MapFS{
			"frontend/dist/dir/": {Mode: 0755 | 020000000},
		}
		handler := NewAssetsHandler(mockFS)
		req := httptest.NewRequest(http.MethodGet, "/dir/", nil)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		assert.Equal(t, http.StatusNotFound, rr.Code)
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
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "root index")
}

type mockFileNoSeeker struct {
	fs.File
}

func (m mockFileNoSeeker) Read(p []byte) (n int, err error) {
	return m.File.Read(p)
}

type mockFSNoSeeker struct {
	fs.FS
}

func (m mockFSNoSeeker) Open(name string) (fs.File, error) {
	f, err := m.FS.Open(name)
	if err != nil {
		return nil, err
	}
	return mockFileNoSeeker{f}, nil
}

func TestAssetsHandler_NoSeeker(t *testing.T) {
	mockFS := fstest.MapFS{
		"index.html": {Data: []byte("no seeker content")},
	}
	handler := &assetsHandler{fs: mockFSNoSeeker{mockFS}}
	
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "no seeker content")
}
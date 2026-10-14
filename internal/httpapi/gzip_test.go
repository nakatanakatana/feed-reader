package httpapi_test

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/nakatanakatana/feed-reader/internal/httpapi"
	"gotest.tools/v3/assert"
)

func decompressGzip(t *testing.T, data []byte) string {
	t.Helper()
	reader, err := gzip.NewReader(bytes.NewReader(data))
	assert.NilError(t, err, "failed to create gzip reader")
	defer func() { _ = reader.Close() }()
	decompressed, err := io.ReadAll(reader)
	assert.NilError(t, err, "failed to decompress gzip data")
	return string(decompressed)
}

func TestGzip_CompressesWhenAcceptEncodingIncludesGzip(t *testing.T) {
	originalBody := `{"message": "` + strings.Repeat("hello world ", 50) + `"}`
	handler := httpapi.NewGzipMiddleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Content-Length", "1000") // test that Content-Length is removed
		w.WriteHeader(http.StatusOK)
		_, err := w.Write([]byte(originalBody))
		assert.NilError(t, err)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK)
	assert.Equal(t, rec.Header().Get("Content-Encoding"), "gzip")
	assert.Assert(t, strings.Contains(rec.Header().Get("Vary"), "Accept-Encoding"))
	assert.Equal(t, rec.Header().Get("Content-Length"), "")

	decompressed := decompressGzip(t, rec.Body.Bytes())
	assert.Equal(t, decompressed, originalBody)
}

func TestGzip_DoesNotCompressWhenAcceptEncodingLacksGzip(t *testing.T) {
	originalBody := "plain uncompressed response"
	handler := httpapi.NewGzipMiddleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		_, err := w.Write([]byte(originalBody))
		assert.NilError(t, err)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Accept-Encoding", "deflate, br")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK)
	assert.Equal(t, rec.Header().Get("Content-Encoding"), "")
	assert.Assert(t, strings.Contains(rec.Header().Get("Vary"), "Accept-Encoding"))
	assert.Equal(t, rec.Body.String(), originalBody)
}

func TestGzip_SkipsCompressionForNoContent(t *testing.T) {
	handler := httpapi.NewGzipMiddleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/no-content", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusNoContent)
	assert.Equal(t, rec.Header().Get("Content-Encoding"), "")
	assert.Assert(t, strings.Contains(rec.Header().Get("Vary"), "Accept-Encoding"))
	assert.Equal(t, rec.Body.Len(), 0)
}

func TestGzip_SkipsCompressionForNotModified(t *testing.T) {
	handler := httpapi.NewGzipMiddleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotModified)
	}))

	req := httptest.NewRequest(http.MethodGet, "/not-modified", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusNotModified)
	assert.Equal(t, rec.Header().Get("Content-Encoding"), "")
	assert.Assert(t, strings.Contains(rec.Header().Get("Vary"), "Accept-Encoding"))
	assert.Equal(t, rec.Body.Len(), 0)
}

type hijackRecorder struct {
	*httptest.ResponseRecorder
	hijacked           bool
	writtenAfterHijack bool
}

func (h *hijackRecorder) Write(b []byte) (int, error) {
	if h.hijacked {
		h.writtenAfterHijack = true
	}
	return h.ResponseRecorder.Write(b)
}

func (h *hijackRecorder) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	h.hijacked = true
	serverConn, clientConn := net.Pipe()
	_ = clientConn.Close()
	return serverConn, bufio.NewReadWriter(bufio.NewReader(serverConn), bufio.NewWriter(serverConn)), nil
}

func TestGzip_HijackDisablesCompression(t *testing.T) {
	var capturedConn net.Conn
	handler := httpapi.NewGzipMiddleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		hijacker, ok := w.(http.Hijacker)
		assert.Assert(t, ok, "ResponseWriter should implement http.Hijacker")
		conn, _, err := hijacker.Hijack()
		assert.NilError(t, err)
		capturedConn = conn
	}))

	req := httptest.NewRequest(http.MethodGet, "/ws", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rawRec := &hijackRecorder{ResponseRecorder: httptest.NewRecorder()}

	handler.ServeHTTP(rawRec, req)
	if capturedConn != nil {
		_ = capturedConn.Close()
	}

	assert.Assert(t, rawRec.hijacked)
	assert.Assert(t, !rawRec.writtenAfterHijack, "Close() must not write gzip footers after connection is hijacked")
}

func TestGzip_SkipsAlreadyCompressedContentTypes(t *testing.T) {
	contentTypes := []string{
		"image/png",
		"image/jpeg",
		"image/webp",
		"image/gif",
		"font/woff2",
		"application/zip",
		"video/mp4",
		"audio/mpeg",
	}

	for _, ct := range contentTypes {
		t.Run(ct, func(t *testing.T) {
			dummyData := []byte("already-compressed-binary-content-1234567890")
			handler := httpapi.NewGzipMiddleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", ct)
				w.WriteHeader(http.StatusOK)
				_, err := w.Write(dummyData)
				assert.NilError(t, err)
			}))

			req := httptest.NewRequest(http.MethodGet, "/asset", nil)
			req.Header.Set("Accept-Encoding", "gzip")
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			assert.Equal(t, rec.Code, http.StatusOK)
			assert.Equal(t, rec.Header().Get("Content-Encoding"), "")
			assert.Equal(t, rec.Body.String(), string(dummyData))
		})
	}
}

func TestGzip_SupportsFlusher(t *testing.T) {
	chunk1 := "first flushed chunk"
	chunk2 := "second flushed chunk"

	handler := httpapi.NewGzipMiddleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)

		flusher, ok := w.(http.Flusher)
		assert.Assert(t, ok, "ResponseWriter should implement http.Flusher")

		_, err := w.Write([]byte(chunk1))
		assert.NilError(t, err)
		flusher.Flush()

		_, err = w.Write([]byte(chunk2))
		assert.NilError(t, err)
	}))

	req := httptest.NewRequest(http.MethodGet, "/stream", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK)
	assert.Equal(t, rec.Header().Get("Content-Encoding"), "gzip")
	assert.Assert(t, rec.Flushed, "underlying recorder should have been flushed")

	decompressed := decompressGzip(t, rec.Body.Bytes())
	assert.Equal(t, decompressed, chunk1+chunk2)
}

func TestGzip_EndToEndWithMux(t *testing.T) {
	testStore := setupTestDB(t)
	handler := httpapi.NewMux(httpapi.Dependencies{
		Store:  testStore,
		Assets: testAssets(),
	})

	t.Run("compresses api response when requested", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v2/feeds", nil)
		req.Header.Set("Accept-Encoding", "gzip")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, rec.Code, http.StatusOK)
		assert.Equal(t, rec.Header().Get("Content-Encoding"), "gzip")
		decompressed := decompressGzip(t, rec.Body.Bytes())
		assert.Assert(t, strings.HasPrefix(decompressed, "[") || strings.HasPrefix(decompressed, "{"))
	})

	t.Run("does not compress api response when gzip not requested", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v2/feeds", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, rec.Code, http.StatusOK)
		assert.Equal(t, rec.Header().Get("Content-Encoding"), "")
		assert.Assert(t, strings.HasPrefix(rec.Body.String(), "[") || strings.HasPrefix(rec.Body.String(), "{"))
	})

	t.Run("compresses asset response when requested", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/index.html", nil)
		req.Header.Set("Accept-Encoding", "gzip")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		assert.Equal(t, rec.Code, http.StatusOK)
		assert.Equal(t, rec.Header().Get("Content-Encoding"), "gzip")
		decompressed := decompressGzip(t, rec.Body.Bytes())
		assert.Equal(t, decompressed, "ok")
	})
}

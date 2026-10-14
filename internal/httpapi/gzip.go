package httpapi

import (
	"bufio"
	"compress/gzip"
	"io"
	"mime"
	"net"
	"net/http"
	"strings"
	"sync"
)

var gzipWriterPool = sync.Pool{
	New: func() any {
		gw, _ := gzip.NewWriterLevel(io.Discard, gzip.DefaultCompression)
		return gw
	},
}

var compressedContentTypes = map[string]bool{
	"image/png":          true,
	"image/jpeg":         true,
	"image/jpg":          true,
	"image/gif":          true,
	"image/webp":         true,
	"image/avif":         true,
	"image/x-icon":       true,
	"font/woff2":         true,
	"application/zip":    true,
	"application/gzip":   true,
	"application/x-gzip": true,
	"application/zstd":   true,
	"application/pdf":    true,
}

func isCompressedContentType(contentType string) bool {
	if contentType == "" {
		return false
	}
	mediaType, _, err := mime.ParseMediaType(contentType)
	if err != nil {
		mediaType = strings.TrimSpace(strings.Split(contentType, ";")[0])
	}
	mediaType = strings.ToLower(mediaType)
	if compressedContentTypes[mediaType] {
		return true
	}
	if strings.HasPrefix(mediaType, "video/") || strings.HasPrefix(mediaType, "audio/") {
		return true
	}
	return false
}

type gzipResponseWriter struct {
	http.ResponseWriter
	wroteHeader bool
	compress    bool
	gw          *gzip.Writer
}

func (w *gzipResponseWriter) WriteHeader(statusCode int) {
	if w.wroteHeader {
		return
	}
	w.wroteHeader = true

	// Skip compression if status code does not allow a body
	if statusCode < 200 || statusCode == http.StatusNoContent || statusCode == http.StatusNotModified {
		w.compress = false
		w.ResponseWriter.WriteHeader(statusCode)
		return
	}

	// Skip if already encoded
	if w.Header().Get("Content-Encoding") != "" {
		w.compress = false
		w.ResponseWriter.WriteHeader(statusCode)
		return
	}

	// Skip if already compressed media type
	contentType := w.Header().Get("Content-Type")
	if isCompressedContentType(contentType) {
		w.compress = false
		w.ResponseWriter.WriteHeader(statusCode)
		return
	}

	w.compress = true
	w.Header().Set("Content-Encoding", "gzip")
	w.Header().Del("Content-Length")

	gw := gzipWriterPool.Get().(*gzip.Writer)
	gw.Reset(w.ResponseWriter)
	w.gw = gw

	w.ResponseWriter.WriteHeader(statusCode)
}

func (w *gzipResponseWriter) Write(b []byte) (int, error) {
	if !w.wroteHeader {
		if w.Header().Get("Content-Type") == "" {
			w.Header().Set("Content-Type", http.DetectContentType(b))
		}
		w.WriteHeader(http.StatusOK)
	}

	if w.compress && w.gw != nil {
		return w.gw.Write(b)
	}
	return w.ResponseWriter.Write(b)
}

func (w *gzipResponseWriter) Flush() {
	if w.compress && w.gw != nil {
		_ = w.gw.Flush()
	}
	if flusher, ok := w.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func (w *gzipResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if hijacker, ok := w.ResponseWriter.(http.Hijacker); ok {
		return hijacker.Hijack()
	}
	return nil, nil, http.ErrNotSupported
}

func (w *gzipResponseWriter) Unwrap() http.ResponseWriter {
	return w.ResponseWriter
}

func (w *gzipResponseWriter) Close() error {
	if w.compress && w.gw != nil {
		err := w.gw.Close()
		gzipWriterPool.Put(w.gw)
		w.gw = nil
		return err
	}
	return nil
}

// NewGzipMiddleware returns a middleware that compresses responses with gzip when supported by the client.
func NewGzipMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
				next.ServeHTTP(w, r)
				return
			}

			w.Header().Add("Vary", "Accept-Encoding")

			gzrw := &gzipResponseWriter{
				ResponseWriter: w,
			}
			defer func() {
				_ = gzrw.Close()
			}()

			next.ServeHTTP(gzrw, r)
		})
	}
}

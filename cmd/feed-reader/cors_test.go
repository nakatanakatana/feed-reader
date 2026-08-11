package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/nakatanakatana/feed-reader/internal/httpapi"
	"github.com/nakatanakatana/feed-reader/internal/readonly"
	"gotest.tools/v3/assert"
)

func TestCORSMiddleware(t *testing.T) {
	tests := []struct {
		name           string
		allowedOrigins []string
		allowedMethods string // empty means primary default via NewCORSMiddleware
		origin         string
		method         string
		wantStatus     int
		wantOrigin     string
		wantHeaders    bool
		wantMethods    string
	}{
		{
			name:           "Allowed origin, GET request",
			allowedOrigins: []string{"http://localhost:3000", "https://example.com"},
			origin:         "http://localhost:3000",
			method:         http.MethodGet,
			wantStatus:     http.StatusOK,
			wantOrigin:     "http://localhost:3000",
			wantHeaders:    true,
			wantMethods:    "GET, POST, OPTIONS, PUT, DELETE",
		},
		{
			name:           "Allowed origin, OPTIONS request",
			allowedOrigins: []string{"http://localhost:3000"},
			origin:         "http://localhost:3000",
			method:         http.MethodOptions,
			wantStatus:     http.StatusNoContent,
			wantOrigin:     "http://localhost:3000",
			wantHeaders:    true,
			wantMethods:    "GET, POST, OPTIONS, PUT, DELETE",
		},
		{
			name:           "Disallowed origin, GET request",
			allowedOrigins: []string{"http://localhost:3000"},
			origin:         "https://malicious.com",
			method:         http.MethodGet,
			wantStatus:     http.StatusOK,
			wantOrigin:     "",
			wantHeaders:    false,
		},
		{
			name:           "No origins configured, GET request",
			allowedOrigins: nil,
			origin:         "http://localhost:3000",
			method:         http.MethodGet,
			wantStatus:     http.StatusOK,
			wantOrigin:     "",
			wantHeaders:    false,
		},
		{
			name:           "Empty origins configured, GET request",
			allowedOrigins: []string{},
			origin:         "http://localhost:3000",
			method:         http.MethodGet,
			wantStatus:     http.StatusOK,
			wantOrigin:     "",
			wantHeaders:    false,
		},
		{
			name:           "Origins with whitespace, GET request",
			allowedOrigins: []string{" http://localhost:3000 ", ""},
			origin:         "http://localhost:3000",
			method:         http.MethodGet,
			wantStatus:     http.StatusOK,
			wantOrigin:     "http://localhost:3000",
			wantHeaders:    true,
			wantMethods:    "GET, POST, OPTIONS, PUT, DELETE",
		},
		{
			name:           "Readonly methods, OPTIONS request",
			allowedOrigins: []string{"http://localhost:3000"},
			allowedMethods: "GET, HEAD, OPTIONS",
			origin:         "http://localhost:3000",
			method:         http.MethodOptions,
			wantStatus:     http.StatusNoContent,
			wantOrigin:     "http://localhost:3000",
			wantHeaders:    true,
			wantMethods:    "GET, HEAD, OPTIONS",
		},
		{
			name:           "Readonly methods, GET request",
			allowedOrigins: []string{"http://localhost:3000"},
			allowedMethods: "GET, HEAD, OPTIONS",
			origin:         "http://localhost:3000",
			method:         http.MethodGet,
			wantStatus:     http.StatusOK,
			wantOrigin:     "http://localhost:3000",
			wantHeaders:    true,
			wantMethods:    "GET, HEAD, OPTIONS",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			})

			var srv http.Handler
			if tt.allowedMethods == "" {
				srv = NewCORSMiddleware(tt.allowedOrigins)(handler)
			} else {
				srv = httpapi.NewCORSMiddleware(tt.allowedOrigins, tt.allowedMethods)(handler)
			}

			req := httptest.NewRequest(tt.method, "http://api.example.com/test", nil)
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}

			w := httptest.NewRecorder()
			srv.ServeHTTP(w, req)

			assert.Equal(t, w.Code, tt.wantStatus)
			assert.Equal(t, w.Header().Get("Access-Control-Allow-Origin"), tt.wantOrigin)

			if tt.wantHeaders {
				assert.Assert(t, w.Header().Get("Access-Control-Allow-Headers") != "")
				assert.Equal(t, w.Header().Get("Access-Control-Allow-Methods"), tt.wantMethods)
				assert.Equal(t, w.Header().Get("Vary"), "Origin")
				if tt.allowedMethods == "GET, HEAD, OPTIONS" {
					allowMethods := w.Header().Get("Access-Control-Allow-Methods")
					assert.Assert(t, !strings.Contains(allowMethods, "POST"))
					assert.Assert(t, !strings.Contains(allowMethods, "PUT"))
					assert.Assert(t, !strings.Contains(allowMethods, "DELETE"))
					assert.Assert(t, !strings.Contains(allowMethods, "PATCH"))
				}
			} else {
				assert.Equal(t, w.Header().Get("Access-Control-Allow-Headers"), "")
				assert.Equal(t, w.Header().Get("Vary"), "")
			}
		})
	}

	t.Run("Readonly middleware still answers OPTIONS without advertising unsafe methods", func(t *testing.T) {
		called := false
		inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			called = true
			w.WriteHeader(http.StatusOK)
		})

		// Match Task 5 order: ReadOnlyMiddleware wraps the CORS-equipped mux.
		corsInner := httpapi.NewCORSMiddleware(
			[]string{"http://localhost:3000"},
			"GET, HEAD, OPTIONS",
		)(inner)
		handler := readonly.ReadOnlyMiddleware(corsInner)

		req := httptest.NewRequest(http.MethodOptions, "http://api.example.com/test", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)

		assert.Equal(t, w.Code, http.StatusNoContent)
		assert.Equal(t, w.Header().Get("Access-Control-Allow-Methods"), "GET, HEAD, OPTIONS")
		assert.Assert(t, !called)

		postReq := httptest.NewRequest(http.MethodPost, "http://api.example.com/test", nil)
		postReq.Header.Set("Origin", "http://localhost:3000")
		postW := httptest.NewRecorder()
		handler.ServeHTTP(postW, postReq)
		assert.Equal(t, postW.Code, http.StatusMethodNotAllowed)
		assert.Equal(t, postW.Header().Get("Allow"), "GET, HEAD, OPTIONS")
		assert.Assert(t, !strings.Contains(postW.Header().Get("Access-Control-Allow-Methods"), "POST"))
	})
}

package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"gotest.tools/v3/assert"
)

func TestCORSMiddleware(t *testing.T) {
	tests := []struct {
		name           string
		allowedOrigins []string
		origin         string
		method         string
		wantStatus     int
		wantOrigin     string
		wantHeaders    bool
	}{
		{
			name:           "Allowed origin, GET request",
			allowedOrigins: []string{"http://localhost:3000", "https://example.com"},
			origin:         "http://localhost:3000",
			method:         http.MethodGet,
			wantStatus:     http.StatusOK,
			wantOrigin:     "http://localhost:3000",
			wantHeaders:    true,
		},
		{
			name:           "Allowed origin, OPTIONS request",
			allowedOrigins: []string{"http://localhost:3000"},
			origin:         "http://localhost:3000",
			method:         http.MethodOptions,
			wantStatus:     http.StatusNoContent,
			wantOrigin:     "http://localhost:3000",
			wantHeaders:    true,
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
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			})

			middleware := NewCORSMiddleware(tt.allowedOrigins)
			srv := middleware(handler)

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
				assert.Equal(t, w.Header().Get("Access-Control-Allow-Methods"), "GET, POST, OPTIONS, PUT, DELETE")
				assert.Equal(t, w.Header().Get("Vary"), "Origin")
			} else {
				assert.Equal(t, w.Header().Get("Access-Control-Allow-Headers"), "")
				assert.Equal(t, w.Header().Get("Vary"), "")
			}
		})
	}
}

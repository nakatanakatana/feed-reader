package main

import (
	"net/http"
	"strings"
)

// NewCORSMiddleware returns a middleware that adds CORS headers to responses.
func NewCORSMiddleware(allowedOrigins []string) func(http.Handler) http.Handler {
	// Normalize origins once
	var normalized []string
	for _, o := range allowedOrigins {
		trimmed := strings.TrimSpace(o)
		if trimmed != "" {
			normalized = append(normalized, trimmed)
		}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin == "" || len(normalized) == 0 {
				next.ServeHTTP(w, r)
				return
			}

			allowed := false
			for _, o := range normalized {
				if o == origin {
					allowed = true
					break
				}
			}

			if !allowed {
				next.ServeHTTP(w, r)
				return
			}

			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Add("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", "Connect-Protocol-Version, Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

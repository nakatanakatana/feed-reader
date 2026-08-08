package main

import (
	"net/http"

	"github.com/nakatanakatana/feed-reader/internal/httpapi"
)

// NewCORSMiddleware returns CORS middleware. Delegates to the shared httpapi package.
func NewCORSMiddleware(allowedOrigins []string) func(http.Handler) http.Handler {
	return httpapi.NewCORSMiddleware(allowedOrigins)
}

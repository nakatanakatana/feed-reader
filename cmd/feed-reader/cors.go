package main

import (
	"net/http"

	"github.com/nakatanakatana/feed-reader/internal/httpapi"
)

// PrimaryCORSMethods is the Access-Control-Allow-Methods value for the primary server.
const PrimaryCORSMethods = "GET, POST, OPTIONS, PUT, DELETE"

// NewCORSMiddleware returns CORS middleware for the primary server.
// Delegates to the shared httpapi package with primary allowed methods.
func NewCORSMiddleware(allowedOrigins []string) func(http.Handler) http.Handler {
	return httpapi.NewCORSMiddleware(allowedOrigins, PrimaryCORSMethods)
}

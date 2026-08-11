package main

import (
	"io/fs"
	"net/http"

	"github.com/nakatanakatana/feed-reader/internal/httpapi"
)

// NewAssetsHandler serves frontend assets. Delegates to the shared httpapi package.
func NewAssetsHandler(assets fs.FS) http.Handler {
	return httpapi.NewAssetsHandler(assets)
}

package main_test

import (
	"testing"

	"github.com/nakatanakatana/feed-reader/internal/httpapi"
)

// Compile-level boundary: readonly command package can import internal/httpapi
// without depending on cmd/feed-reader.
func TestHTTPAPIPackageImportable(t *testing.T) {
	var _ httpapi.Dependencies
	var _ = httpapi.NewMux
	var _ = httpapi.NewStrictHandler
}

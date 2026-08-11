package httpapi

import (
	"net/http"

	"github.com/nakatanakatana/feed-reader/gen/openapi"
)

// NewStrictHandler builds the OpenAPI strict server from dependencies.
func NewStrictHandler(deps Dependencies) openapi.StrictServerInterface {
	return &OpenAPIHandler{
		store:         deps.Store,
		uuidGenerator: realUUIDGenerator{},
		fetcher:       deps.Fetcher,
		itemFetcher:   deps.ItemFetcher,
		opmlImporter:  deps.OPMLImporter,
	}
}

const primaryCORSMethods = "GET, POST, OPTIONS, PUT, DELETE"

// NewMux assembles the HTTP handler for OpenAPI routes, assets, and CORS.
func NewMux(deps Dependencies) http.Handler {
	mux := http.NewServeMux()
	openapi.HandlerFromMuxWithBaseURL(
		openapi.NewStrictHandler(NewStrictHandler(deps), nil),
		mux,
		"/api/v2",
	)
	mux.Handle("/api/", http.NotFoundHandler())
	mux.Handle("/", NewAssetsHandler(deps.Assets))
	methods := deps.AllowedMethods
	if methods == "" {
		methods = primaryCORSMethods
	}
	return NewCORSMiddleware(deps.AllowedOrigins, methods)(mux)
}

package readonly

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"
)

const (
	allowedMethodsHeader = "GET, HEAD, OPTIONS"
	readinessTimeout     = 2 * time.Second
)

// ReadOnlyMiddleware rejects unsafe HTTP methods before invoking next.
func ReadOnlyMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			next.ServeHTTP(w, r)
		default:
			w.Header().Set("Allow", allowedMethodsHeader)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"code":    "readonly",
				"message": "method not allowed on read-only replica",
			})
		}
	})
}

// NewReadinessHandler returns a handler that reports 200 only after a read query succeeds.
func NewReadinessHandler(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), readinessTimeout)
		defer cancel()

		if err := db.PingContext(ctx); err != nil {
			http.Error(w, err.Error(), http.StatusServiceUnavailable)
			return
		}

		var one int
		if err := db.QueryRowContext(ctx, "SELECT 1").Scan(&one); err != nil {
			http.Error(w, err.Error(), http.StatusServiceUnavailable)
			return
		}

		w.WriteHeader(http.StatusOK)
	})
}

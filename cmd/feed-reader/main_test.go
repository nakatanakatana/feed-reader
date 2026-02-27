package main

import (
	"os"
	"testing"
	"time"

	"github.com/caarlos0/env/v11"
	"gotest.tools/v3/assert"
	"gotest.tools/v3/assert/cmp"
)

func TestConfig_Parse(t *testing.T) {
	// Clear environment variables after the test
	t.Cleanup(func() {
		_ = os.Unsetenv("PORT")
		_ = os.Unsetenv("DB_PATH")
		_ = os.Unsetenv("FETCH_INTERVAL")
		_ = os.Unsetenv("MAX_WORKERS")
		_ = os.Unsetenv("SKIP_DB_MIGRATION")
		_ = os.Unsetenv("WRITE_QUEUE_MAX_BATCH_SIZE")
		_ = os.Unsetenv("WRITE_QUEUE_FLUSH_INTERVAL")
		_ = os.Unsetenv("CORS_ALLOWED_ORIGINS")
	})

	tests := []struct {
		name    string
		envs    map[string]string
		want    config
		wantErr bool
	}{
		{
			name: "Default values",
			envs: map[string]string{},
			want: config{
				Port:                    "8080",
				DBPath:                  "feed-reader.db",
				FetchInterval:           30 * time.Minute,
				MaxWorkers:              10,
				SkipDBMigration:         false,
				WriteQueueMaxBatchSize:  50,
				WriteQueueFlushInterval: 100 * time.Millisecond,
				CORSAllowedOrigins:      nil,
			},
		},
		{
			name: "Custom values",
			envs: map[string]string{
				"PORT":                       "9090",
				"DB_PATH":                    "test.db",
				"FETCH_INTERVAL":             "1h",
				"MAX_WORKERS":                "20",
				"SKIP_DB_MIGRATION":          "true",
				"WRITE_QUEUE_MAX_BATCH_SIZE": "100",
				"WRITE_QUEUE_FLUSH_INTERVAL": "200ms",
				"CORS_ALLOWED_ORIGINS":       "http://localhost:3000,https://example.com",
			},
			want: config{
				Port:                    "9090",
				DBPath:                  "test.db",
				FetchInterval:           time.Hour,
				MaxWorkers:              20,
				SkipDBMigration:         true,
				WriteQueueMaxBatchSize:  100,
				WriteQueueFlushInterval: 200 * time.Millisecond,
				CORSAllowedOrigins:      []string{"http://localhost:3000", "https://example.com"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clear relevant env vars
			_ = os.Unsetenv("PORT")
			_ = os.Unsetenv("DB_PATH")
			_ = os.Unsetenv("FETCH_INTERVAL")
			_ = os.Unsetenv("MAX_WORKERS")
			_ = os.Unsetenv("SKIP_DB_MIGRATION")
			_ = os.Unsetenv("WRITE_QUEUE_MAX_BATCH_SIZE")
			_ = os.Unsetenv("WRITE_QUEUE_FLUSH_INTERVAL")
			_ = os.Unsetenv("CORS_ALLOWED_ORIGINS")

			for k, v := range tt.envs {
				err := os.Setenv(k, v)
				assert.NilError(t, err)
			}

			var cfg config
			err := env.Parse(&cfg)
			if tt.wantErr {
				assert.Assert(t, err != nil)
				return
			}
			assert.NilError(t, err)
			assert.Assert(t, cmp.DeepEqual(cfg, tt.want))
		})
	}
}

package store

import (
	"testing"
)

func TestCleanURL(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{
			name:  "No query parameters",
			input: "https://example.com/article",
			want:  "https://example.com/article",
		},
		{
			name:  "Keep non-tracking parameters",
			input: "https://example.com/article?id=123&category=tech",
			want:  "https://example.com/article?category=tech&id=123", // Sorted by net/url Query().Encode()
		},
		{
			name:  "Remove utm_ parameters",
			input: "https://example.com/article?utm_source=rss&utm_medium=feed&id=123",
			want:  "https://example.com/article?id=123",
		},
		{
			name:  "Remove case-insensitive utm_",
			input: "https://example.com/article?UTM_SOURCE=rss&id=123",
			want:  "https://example.com/article?id=123",
		},
		{
			name:  "Remove gclid, fbclid, msclkid, yclid",
			input: "https://example.com/article?gclid=abc&fbclid=def&msclkid=ghi&yclid=jkl&id=123",
			want:  "https://example.com/article?id=123",
		},
		{
			name:  "Remove case-insensitive tracking parameters",
			input: "https://example.com/article?GCLID=abc&FBCLID=def&id=123",
			want:  "https://example.com/article?id=123",
		},
		{
			name:    "Malformed URL returns error",
			input:   "http://[::1]%2F",
			want:    "",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := CleanURL(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("CleanURL() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("CleanURL() = %v, want %v", got, tt.want)
			}
		})
	}
}

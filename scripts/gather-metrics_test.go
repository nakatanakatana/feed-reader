package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestCalculateBundleSize(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "bundle-test")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := os.RemoveAll(tmpDir); err != nil {
			t.Errorf("failed to remove temp dir: %v", err)
		}
	})

	jsContent := []byte("console.log('hello');")  // 21 bytes
	cssContent := []byte("body { color: red; } ") // 21 bytes
	htmlContent := []byte("<html></html>")        // 13 bytes
	txtContent := []byte("ignore me")             // 9 bytes

	if err := os.WriteFile(filepath.Join(tmpDir, "app.js"), jsContent, 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmpDir, "style.css"), cssContent, 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmpDir, "index.html"), htmlContent, 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmpDir, "readme.txt"), txtContent, 0644); err != nil {
		t.Fatal(err)
	}

	breakdown, err := calculateBundleSize(tmpDir)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	tests := []struct {
		name     string
		got      int64
		expected int64
	}{
		{"JS", breakdown.JS, 21},
		{"CSS", breakdown.CSS, 21},
		{"HTML", breakdown.HTML, 13},
		{"Other", breakdown.Other, 9},
		{"Total", breakdown.Total(), 64},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %s size %d, got %d", tt.name, tt.expected, tt.got)
			}
		})
	}
}

func TestBuildCCCCArgs(t *testing.T) {
	got := buildCCCCArgs([]string{"gen/**", "store/db.go"}, "cmd", "api", "store")
	want := []string{
		"--exclude", "gen/**",
		"--exclude", "store/db.go",
		"cmd", "api", "store",
	}
	if len(got) != len(want) {
		t.Fatalf("expected %d args, got %d", len(want), len(got))
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("arg[%d]: expected %q, got %q", i, want[i], got[i])
		}
	}
}

func TestParseCCCC(t *testing.T) {
	jsonData := []byte(`{
		"files": [],
		"summary": {
			"cognitive": {
				"sum": 10.0,
				"max": 5.0,
				"median": 1.0,
				"p90": 3.0,
				"p95": 4.0
			},
			"cyclomatic": {
				"sum": 20.0,
				"max": 8.0,
				"median": 2.0,
				"p90": 5.0,
				"p95": 6.0
			}
		}
	}`)

	res, err := parseCCCC(jsonData)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if res.Summary.Cognitive.Sum != 10.0 {
		t.Errorf("expected cognitive sum 10.0, got %f", res.Summary.Cognitive.Sum)
	}
	if res.Summary.Cyclomatic.Max != 8.0 {
		t.Errorf("expected cyclomatic max 8.0, got %f", res.Summary.Cyclomatic.Max)
	}
}

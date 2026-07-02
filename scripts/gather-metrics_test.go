package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/goccy/go-yaml"
)

type aquaConfig struct {
	Packages []aquaPackage `yaml:"packages"`
}

type aquaPackage struct {
	Name string `yaml:"name"`
}

type aquaChecksums struct {
	Checksums []struct {
		ID string `json:"id"`
	} `json:"checksums"`
}

type renovateConfig struct {
	Extends        []string                `json:"extends"`
	CustomManagers []renovateCustomManager `json:"customManagers"`
}

type renovateCustomManager struct {
	CustomType          string   `json:"customType"`
	DatasourceTemplate  string   `json:"datasourceTemplate"`
	DepNameTemplate     string   `json:"depNameTemplate"`
	PackageNameTemplate string   `json:"packageNameTemplate"`
	ManagerFilePatterns []string `json:"managerFilePatterns"`
	MatchStrings        []string `json:"matchStrings"`
}

type ciWorkflow struct {
	Env  map[string]string `yaml:"env"`
	Jobs map[string]struct {
		Steps []ciStep `yaml:"steps"`
	} `yaml:"jobs"`
}

type ciStep struct {
	Uses string            `yaml:"uses"`
	With map[string]string `yaml:"with"`
}

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

func TestTSCCCCExcludes(t *testing.T) {
	want := []string{
		"**/*.gen.ts",
		"frontend/src/lib/api/types-generated.ts",
		"frontend/src/lib/api/generated/**",
		"frontend/src/mocks/generated/**",
	}
	if len(tsCCCCExcludes) != len(want) {
		t.Fatalf("expected %d excludes, got %d", len(want), len(tsCCCCExcludes))
	}
	for i := range want {
		if tsCCCCExcludes[i] != want[i] {
			t.Errorf("exclude[%d]: expected %q, got %q", i, want[i], tsCCCCExcludes[i])
		}
	}
}

func TestBuildCCCCArgs(t *testing.T) {
	got := buildCCCCArgs("go", []string{"gen/**", "store/db.go"}, "cmd", "api", "store")
	want := []string{
		"--lang", "go",
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

func TestCCCCIsInstalledByGitHubActionInCoverageAggregation(t *testing.T) {
	workflowData, err := os.ReadFile("../.github/workflows/ci.yaml")
	if err != nil {
		t.Fatal(err)
	}
	var workflow ciWorkflow
	if err := yaml.Unmarshal(workflowData, &workflow); err != nil {
		t.Fatal(err)
	}

	if workflow.Env["CCCC_VERSION"] == "" {
		t.Fatal("expected CI workflow to define CCCC_VERSION for Renovate")
	}
	if !strings.HasPrefix(workflow.Env["CCCC_VERSION"], "v1.") {
		t.Fatalf("expected CCCC_VERSION to track v1 releases, got %q", workflow.Env["CCCC_VERSION"])
	}

	job, ok := workflow.Jobs["coverage-aggregation"]
	if !ok {
		t.Fatal("expected coverage-aggregation job")
	}
	for _, step := range job.Steps {
		if step.Uses != "moznion/cccc-action@v1" {
			continue
		}
		if step.With["version"] != "${{ env.CCCC_VERSION }}" {
			t.Fatalf("expected cccc-action version to use CCCC_VERSION env, got %q", step.With["version"])
		}
		return
	}
	t.Fatal("expected coverage-aggregation to install cccc with moznion/cccc-action@v1")
}

func TestCCCCIsNotInstalledByAqua(t *testing.T) {
	aquaData, err := os.ReadFile("../aqua.yaml")
	if err != nil {
		t.Fatal(err)
	}
	var aqua aquaConfig
	if err := yaml.Unmarshal(aquaData, &aqua); err != nil {
		t.Fatal(err)
	}

	for _, pkg := range aqua.Packages {
		if strings.HasPrefix(pkg.Name, "cccc@") {
			t.Fatalf("expected cccc to be installed by cccc-action, got aqua package %q", pkg.Name)
		}
	}

	checksumsData, err := os.ReadFile("../aqua-checksums.json")
	if err != nil {
		t.Fatal(err)
	}
	var checksums aquaChecksums
	if err := json.Unmarshal(checksumsData, &checksums); err != nil {
		t.Fatal(err)
	}

	for _, checksum := range checksums.Checksums {
		if strings.Contains(checksum.ID, "github.com/moznion/cccc/") {
			t.Fatalf("expected aqua checksums not to include cccc, got %q", checksum.ID)
		}
	}
}

func TestRenovateTracksCCCCVersionWithGitHubActionsVersionPreset(t *testing.T) {
	data, err := os.ReadFile("../renovate.json")
	if err != nil {
		t.Fatal(err)
	}
	var config renovateConfig
	if err := json.Unmarshal(data, &config); err != nil {
		t.Fatal(err)
	}

	if !containsString(config.Extends, "customManagers:githubActionsVersions") {
		t.Fatalf("expected Renovate to extend customManagers:githubActionsVersions, got %#v", config.Extends)
	}
	for _, manager := range config.CustomManagers {
		if manager.DepNameTemplate != "moznion/cccc" {
			continue
		}
		t.Fatalf("expected Renovate cccc version tracking to use preset instead of repository custom manager")
	}
}

func containsString(values []string, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
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

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
	Name     string `yaml:"name"`
	Registry string `yaml:"registry"`
}

type aquaRegistry struct {
	Packages []aquaRegistryPackage `yaml:"packages"`
}

type aquaRegistryPackage struct {
	Name  string `yaml:"name"`
	Asset string `yaml:"asset"`
	Files []struct {
		Name string `yaml:"name"`
	} `yaml:"files"`
	Checksum struct {
		Asset string `yaml:"asset"`
	} `yaml:"checksum"`
}

type aquaChecksums struct {
	Checksums []struct {
		ID string `json:"id"`
	} `json:"checksums"`
}

type renovateConfig struct {
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

func TestCCCCAquaPackageTracksV1ReleaseLayout(t *testing.T) {
	aquaData, err := os.ReadFile("../aqua.yaml")
	if err != nil {
		t.Fatal(err)
	}
	var aqua aquaConfig
	if err := yaml.Unmarshal(aquaData, &aqua); err != nil {
		t.Fatal(err)
	}

	registryData, err := os.ReadFile("../registry.yaml")
	if err != nil {
		t.Fatal(err)
	}
	var registry aquaRegistry
	if err := yaml.Unmarshal(registryData, &registry); err != nil {
		t.Fatal(err)
	}

	pkg := findAquaPackage(t, aqua.Packages, "cccc")
	if pkg.Registry != "local" {
		t.Fatalf("expected cccc to use local registry, got %q", pkg.Registry)
	}
	ccccVersion, ok := strings.CutPrefix(pkg.Name, "cccc@")
	if !ok {
		t.Fatalf("expected cccc package name with version, got %q", pkg.Name)
	}
	if !strings.HasPrefix(ccccVersion, "v1.") {
		t.Fatalf("expected cccc to track v1 release layout, got %q", pkg.Name)
	}

	registryPkg := findRegistryPackage(t, registry.Packages, "cccc")
	if registryPkg.Asset != "cccc-{{.Version}}-{{.Arch}}-{{.OS}}.tar.gz" {
		t.Errorf("asset: expected unified cccc archive, got %q", registryPkg.Asset)
	}
	if registryPkg.Checksum.Asset != "cccc-{{.Version}}-{{.Arch}}-{{.OS}}.sha256" {
		t.Errorf("checksum asset: expected unified cccc checksum, got %q", registryPkg.Checksum.Asset)
	}
	if len(registryPkg.Files) != 1 || registryPkg.Files[0].Name != "cccc" {
		t.Fatalf("expected registry file to install cccc, got %#v", registryPkg.Files)
	}

	checksumsData, err := os.ReadFile("../aqua-checksums.json")
	if err != nil {
		t.Fatal(err)
	}
	var checksums aquaChecksums
	if err := json.Unmarshal(checksumsData, &checksums); err != nil {
		t.Fatal(err)
	}

	var ccccChecksumCount int
	for _, checksum := range checksums.Checksums {
		if strings.Contains(checksum.ID, "github.com/moznion/cccc/") {
			ccccChecksumCount++
			expectedChecksumIDPart := "/" + ccccVersion + "/cccc-" + ccccVersion + "-"
			if !strings.Contains(checksum.ID, expectedChecksumIDPart) {
				t.Fatalf("unexpected stale cccc checksum id %q", checksum.ID)
			}
		}
	}
	if ccccChecksumCount != 4 {
		t.Fatalf("expected 4 cccc v1.0.0 checksum entries, got %d", ccccChecksumCount)
	}
}

func TestRenovateTracksLocalCCCCPackageAsGitHubRelease(t *testing.T) {
	data, err := os.ReadFile("../renovate.json")
	if err != nil {
		t.Fatal(err)
	}
	var config renovateConfig
	if err := json.Unmarshal(data, &config); err != nil {
		t.Fatal(err)
	}

	for _, manager := range config.CustomManagers {
		if manager.DepNameTemplate != "moznion/cccc" {
			continue
		}
		if manager.CustomType != "regex" {
			t.Fatalf("expected cccc custom manager type regex, got %q", manager.CustomType)
		}
		if manager.DatasourceTemplate != "github-releases" {
			t.Fatalf("expected cccc datasource github-releases, got %q", manager.DatasourceTemplate)
		}
		if manager.PackageNameTemplate != "moznion/cccc" {
			t.Fatalf("expected cccc packageNameTemplate moznion/cccc, got %q", manager.PackageNameTemplate)
		}
		if !containsString(manager.ManagerFilePatterns, "/^aqua\\.ya?ml$/") {
			t.Fatalf("expected cccc manager to target aqua.yaml, got %#v", manager.ManagerFilePatterns)
		}
		for _, matchString := range manager.MatchStrings {
			if strings.Contains(matchString, "cccc@(?<currentValue>") && strings.Contains(matchString, "registry: local") {
				return
			}
		}
		t.Fatalf("expected cccc manager to match local cccc package, got %#v", manager.MatchStrings)
	}
	t.Fatal("expected Renovate custom manager for local cccc package")
}

func findAquaPackage(t *testing.T, packages []aquaPackage, prefix string) aquaPackage {
	t.Helper()
	for _, pkg := range packages {
		if len(pkg.Name) >= len(prefix) && pkg.Name[:len(prefix)] == prefix {
			return pkg
		}
	}
	t.Fatalf("package %s not found", prefix)
	return aquaPackage{}
}

func findRegistryPackage(t *testing.T, packages []aquaRegistryPackage, name string) aquaRegistryPackage {
	t.Helper()
	for _, pkg := range packages {
		if pkg.Name == name {
			return pkg
		}
	}
	t.Fatalf("registry package %s not found", name)
	return aquaRegistryPackage{}
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

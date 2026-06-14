package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
)

type OctocovMetric struct {
	Key   string  `json:"key"`
	Name  string  `json:"name"`
	Value float64 `json:"value"`
	Unit  string  `json:"unit,omitempty"`
}

type OctocovReport struct {
	Key     string          `json:"key"`
	Name    string          `json:"name"`
	Metrics []OctocovMetric `json:"metrics"`
}

type ComplexityMetrics struct {
	Sum    float64 `json:"sum"`
	Max    float64 `json:"max"`
	Median float64 `json:"median"`
	P90    float64 `json:"p90"`
	P95    float64 `json:"p95"`
}

type CCCCSummary struct {
	Cognitive  ComplexityMetrics `json:"cognitive"`
	Cyclomatic ComplexityMetrics `json:"cyclomatic"`
}

type CCCCResult struct {
	Summary CCCCSummary `json:"summary"`
}

type BundleSizeBreakdown struct {
	JS    int64
	CSS   int64
	HTML  int64
	Other int64
}

func (b BundleSizeBreakdown) Total() int64 {
	return b.JS + b.CSS + b.HTML + b.Other
}

func calculateBundleSize(distDir string) (BundleSizeBreakdown, error) {
	var breakdown BundleSizeBreakdown
	err := filepath.WalkDir(distDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() {
			info, err := d.Info()
			if err != nil {
				return err
			}
			switch filepath.Ext(path) {
			case ".js":
				breakdown.JS += info.Size()
			case ".css":
				breakdown.CSS += info.Size()
			case ".html":
				breakdown.HTML += info.Size()
			default:
				breakdown.Other += info.Size()
			}
		}
		return nil
	})
	return breakdown, err
}

func parseCCCC(jsonData []byte) (CCCCResult, error) {
	var res CCCCResult
	err := json.Unmarshal(jsonData, &res)
	return res, err
}

func runCCCC(bin string, args ...string) (CCCCResult, error) {
	cmd := exec.Command(bin, args...)
	out, err := cmd.Output()
	if err != nil {
		return CCCCResult{}, fmt.Errorf("failed to run %s: %w", bin, err)
	}
	return parseCCCC(out)
}

var goCCCCExcludes = []string{
	"gen/**",
	"store/db.go",
	"store/models.go",
	"store/query.sql.go",
}

var tsCCCCExcludes = []string{
	"**/*.gen.ts",
	"frontend/src/lib/api/types-generated.ts",
	"frontend/src/lib/api/generated/**",
	"frontend/src/mocks/generated/**",
}

func buildCCCCArgs(excludes []string, paths ...string) []string {
	args := make([]string, 0, len(excludes)*2+len(paths))
	for _, exclude := range excludes {
		args = append(args, "--exclude", exclude)
	}
	return append(args, paths...)
}

func writeOctocovMetrics(path string, report OctocovReport) error {
	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func main() {
	// 1. Bundle Size
	bundleSize, err := calculateBundleSize("frontend/dist")
	if err != nil {
		fmt.Printf("Warning: failed to calculate bundle size: %v\n", err)
	} else {
		report := OctocovReport{
			Key:  "bundle_size",
			Name: "Bundle Size",
			Metrics: []OctocovMetric{
				{Key: "js_size", Name: "JS Size", Value: float64(bundleSize.JS), Unit: " bytes"},
				{Key: "css_size", Name: "CSS Size", Value: float64(bundleSize.CSS), Unit: " bytes"},
				{Key: "html_size", Name: "HTML Size", Value: float64(bundleSize.HTML), Unit: " bytes"},
				{Key: "other_size", Name: "Other Size", Value: float64(bundleSize.Other), Unit: " bytes"},
				{Key: "total_size", Name: "Total Size", Value: float64(bundleSize.Total()), Unit: " bytes"},
			},
		}
		if err := writeOctocovMetrics("bundle-size.json", report); err != nil {
			fmt.Printf("Error writing bundle-size.json: %v\n", err)
		}
	}

	// 2. Code Complexity via cccc
	var metrics []OctocovMetric

	// Run cccc-go
	goRes, err := runCCCC("cccc-go", buildCCCCArgs(goCCCCExcludes, "cmd", "api", "store")...)
	if err != nil {
		fmt.Printf("Warning: cccc-go failed: %v\n", err)
	} else {
		metrics = append(metrics, []OctocovMetric{
			{Key: "go_cognitive_sum", Name: "Go Cognitive Complexity (Sum)", Value: goRes.Summary.Cognitive.Sum},
			{Key: "go_cognitive_max", Name: "Go Cognitive Complexity (Max)", Value: goRes.Summary.Cognitive.Max},
			{Key: "go_cognitive_median", Name: "Go Cognitive Complexity (Median)", Value: goRes.Summary.Cognitive.Median},
			{Key: "go_cognitive_p90", Name: "Go Cognitive Complexity (p90)", Value: goRes.Summary.Cognitive.P90},
			{Key: "go_cognitive_p95", Name: "Go Cognitive Complexity (p95)", Value: goRes.Summary.Cognitive.P95},
			{Key: "go_cyclomatic_sum", Name: "Go Cyclomatic Complexity (Sum)", Value: goRes.Summary.Cyclomatic.Sum},
			{Key: "go_cyclomatic_max", Name: "Go Cyclomatic Complexity (Max)", Value: goRes.Summary.Cyclomatic.Max},
		}...)
	}

	// Run cccc-es
	esRes, err := runCCCC("cccc-es", buildCCCCArgs(tsCCCCExcludes, "frontend/src")...)
	if err != nil {
		fmt.Printf("Warning: cccc-es failed: %v\n", err)
	} else {
		metrics = append(metrics, []OctocovMetric{
			{Key: "ts_cognitive_sum", Name: "TS Cognitive Complexity (Sum)", Value: esRes.Summary.Cognitive.Sum},
			{Key: "ts_cognitive_max", Name: "TS Cognitive Complexity (Max)", Value: esRes.Summary.Cognitive.Max},
			{Key: "ts_cognitive_median", Name: "TS Cognitive Complexity (Median)", Value: esRes.Summary.Cognitive.Median},
			{Key: "ts_cognitive_p90", Name: "TS Cognitive Complexity (p90)", Value: esRes.Summary.Cognitive.P90},
			{Key: "ts_cognitive_p95", Name: "TS Cognitive Complexity (p95)", Value: esRes.Summary.Cognitive.P95},
			{Key: "ts_cyclomatic_sum", Name: "TS Cyclomatic Complexity (Sum)", Value: esRes.Summary.Cyclomatic.Sum},
			{Key: "ts_cyclomatic_max", Name: "TS Cyclomatic Complexity (Max)", Value: esRes.Summary.Cyclomatic.Max},
		}...)
	}

	if len(metrics) > 0 {
		report := OctocovReport{
			Key:     "cccc_complexity",
			Name:    "Code Complexity",
			Metrics: metrics,
		}
		if err := writeOctocovMetrics("cccc-metrics.json", report); err != nil {
			fmt.Printf("Error writing cccc-metrics.json: %v\n", err)
		}
	}
}

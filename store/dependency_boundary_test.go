package store_test

import (
	"os/exec"
	"strings"
	"testing"
)

func TestStoreDependencyBoundary(t *testing.T) {
	out, err := exec.Command("go", "list", "-buildvcs=false", "-deps", "github.com/nakatanakatana/feed-reader/store").Output()
	if err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			t.Fatalf("go list ./store failed: %v\n%s", err, ee.Stderr)
		}
		t.Fatalf("go list ./store failed: %v", err)
	}
	deps := string(out)

	t.Run("no modernc sqlite", func(t *testing.T) {
		if strings.Contains(deps, "modernc.org/sqlite") {
			t.Error("store package must not depend on modernc.org/sqlite")
		}
	})
	t.Run("no ncruces sqlite module", func(t *testing.T) {
		if strings.Contains(deps, "ncruces/go-sqlite3") {
			t.Error("store package must not depend on ncruces/go-sqlite3")
		}
	})
}

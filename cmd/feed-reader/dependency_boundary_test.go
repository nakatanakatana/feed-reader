package main_test

import (
	"os/exec"
	"strings"
	"testing"
)

func TestPrimaryDependencyBoundary(t *testing.T) {
	out, err := exec.Command("go", "list", "-buildvcs=false", "-deps", "github.com/nakatanakatana/feed-reader/cmd/feed-reader").Output()
	if err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			t.Fatalf("go list failed: %v\n%s", err, ee.Stderr)
		}
		t.Fatalf("go list ./cmd/feed-reader failed: %v", err)
	}
	deps := string(out)

	t.Run("no ncruces sqlite module", func(t *testing.T) {
		if strings.Contains(deps, "ncruces/go-sqlite3") {
			t.Error("cmd/feed-reader must not depend on ncruces/go-sqlite3")
		}
	})
	t.Run("no mattn/go-sqlite3", func(t *testing.T) {
		if strings.Contains(deps, "mattn/go-sqlite3") {
			t.Error("cmd/feed-reader must not depend on mattn/go-sqlite3")
		}
	})
	t.Run("no psanford/sqlite3vfs", func(t *testing.T) {
		if strings.Contains(deps, "psanford/sqlite3vfs") {
			t.Error("cmd/feed-reader must not depend on psanford/sqlite3vfs")
		}
	})
}

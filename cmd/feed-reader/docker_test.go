package main

import (
	"os/exec"
	"testing"
)

func TestDockerImageExists(t *testing.T) {
	cmd := exec.Command("docker", "inspect", "feed-reader-test:latest")
	if err := cmd.Run(); err != nil {
		t.Fatalf("Docker image feed-reader-test:latest not found: %v", err)
	}
}

package main

import (
	"fmt"
	"net/http"
	"os/exec"
	"testing"
	"time"
)

func TestDockerImageExists(t *testing.T) {
	cmd := exec.Command("docker", "inspect", "feed-reader-test:latest")
	if err := cmd.Run(); err != nil {
		t.Fatalf("Docker image feed-reader-test:latest not found: %v", err)
	}
}

func TestDockerRuntime(t *testing.T) {
	containerName := "feed-reader-runtime-test"
	// Ensure container is removed after test
	defer exec.Command("docker", "rm", "-f", containerName).Run()

	// Run the container
	cmd := exec.Command("docker", "run", "-d", "--name", containerName, "-p", "8081:8080", "feed-reader-test:latest")
	if err := cmd.Run(); err != nil {
		t.Fatalf("Failed to start Docker container: %v", err)
	}

	// Wait for the application to start
	time.Sleep(2 * time.Second)

	// Check if the application is accessible
	resp, err := http.Get("http://localhost:8081")
	if err != nil {
		t.Fatalf("Failed to access application: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status OK, got %v", resp.Status)
	}

	// Verify logs for database initialization
	out, err := exec.Command("docker", "logs", containerName).CombinedOutput()
	if err != nil {
		t.Errorf("Failed to get Docker logs: %v", err)
	}
	fmt.Printf("Container logs: %s\n", string(out))
}

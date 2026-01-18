package main

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// Mock task for testing scheduler
type MockTask struct {
	callCount int32
}

func (m *MockTask) Run(ctx context.Context) error {
	atomic.AddInt32(&m.callCount, 1)
	return nil
}

func TestScheduler_Start(t *testing.T) {
	interval := 10 * time.Millisecond
	mockTask := &MockTask{}

	// Scheduler will be defined in scheduler.go
	scheduler := NewScheduler(interval, 0, mockTask.Run)

	ctx := t.Context()

	// Start scheduler in a goroutine
	go scheduler.Start(ctx)

	// Wait for at least 2 ticks
	time.Sleep(25 * time.Millisecond)

	count := atomic.LoadInt32(&mockTask.callCount)
	assert.GreaterOrEqual(t, count, int32(2), "Should have triggered at least 2 times")
}

func TestScheduler_Start_WithJitter(t *testing.T) {
	interval := 10 * time.Millisecond
	maxJitter := 10 * time.Millisecond
	mockTask := &MockTask{}

	scheduler := NewScheduler(interval, maxJitter, mockTask.Run)
	ctx := t.Context()

	start := time.Now()
	go scheduler.Start(ctx)

	// Wait for 1st tick (immediate) + 2nd tick (interval + jitter)
	// Max delay for 2nd tick = 10 + 10 = 20ms.
	// We wait 30ms to be safe.
	time.Sleep(30 * time.Millisecond)

	count := atomic.LoadInt32(&mockTask.callCount)
	assert.GreaterOrEqual(t, count, int32(2), "Should have triggered at least 2 times")

	elapsed := time.Since(start)
	// Just ensuring it didn't block forever or panic
	assert.Greater(t, elapsed, 10*time.Millisecond)
}

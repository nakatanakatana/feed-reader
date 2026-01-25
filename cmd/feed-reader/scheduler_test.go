package main

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"pgregory.net/rapid"
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

func TestScheduler_nextDelay_PBT(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		interval := time.Duration(rapid.Int64Range(1, int64(24*time.Hour)).Draw(t, "interval"))
		maxJitter := time.Duration(rapid.Int64Range(0, int64(time.Hour)).Draw(t, "maxJitter"))

		s := NewScheduler(interval, maxJitter, nil)

		for i := 0; i < 100; i++ {
			delay := s.nextDelay()

			assert.GreaterOrEqual(t, int64(delay), int64(interval), "Delay should be at least the interval")
			if maxJitter > 0 {
				assert.Less(t, int64(delay), int64(interval+maxJitter), "Delay should be less than interval + maxJitter")
			} else {
				assert.Equal(t, interval, delay, "Delay should equal interval when maxJitter is 0")
			}
		}
	})
}

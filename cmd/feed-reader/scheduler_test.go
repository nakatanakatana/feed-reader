package main

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"gotest.tools/v3/assert"
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
	assert.Assert(t, count >= 2, "Should have triggered at least 2 times")
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
	assert.Assert(t, count >= 2, "Should have triggered at least 2 times")

	elapsed := time.Since(start)
	// Just ensuring it didn't block forever or panic
	assert.Assert(t, elapsed > 10*time.Millisecond)
}

func TestScheduler_nextDelay_PBT(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		interval := time.Duration(rapid.Int64Range(1, int64(24*time.Hour)).Draw(t, "interval"))
		maxJitter := time.Duration(rapid.Int64Range(0, int64(time.Hour)).Draw(t, "maxJitter"))

		s := NewScheduler(interval, maxJitter, nil)

		for i := 0; i < 100; i++ {
			delay := s.nextDelay()

			assert.Assert(t, int64(delay) >= int64(interval), "Delay should be at least the interval")
			if maxJitter > 0 {
				assert.Assert(t, int64(delay) < int64(interval+maxJitter), "Delay should be less than interval + maxJitter")
			} else {
				assert.Equal(t, delay, interval, "Delay should equal interval when maxJitter is 0")
			}
		}
	})
}

func TestCalculateAdaptiveInterval(t *testing.T) {
	defaultInterval := 1 * time.Hour
	minInterval := 15 * time.Minute
	maxInterval := 24 * time.Hour

	t.Run("frequent updates", func(t *testing.T) {
		now := time.Now()
		// Updates every 5 minutes
		pubDates := []time.Time{
			now,
			now.Add(-5 * time.Minute),
			now.Add(-10 * time.Minute),
			now.Add(-15 * time.Minute),
		}
		interval := CalculateAdaptiveInterval(pubDates, defaultInterval, minInterval, maxInterval)
		assert.Equal(t, interval, minInterval, "Should be capped at minInterval")
	})

	t.Run("rare updates", func(t *testing.T) {
		now := time.Now()
		// Updates every 2 days
		pubDates := []time.Time{
			now,
			now.Add(-48 * time.Hour),
			now.Add(-96 * time.Hour),
		}
		interval := CalculateAdaptiveInterval(pubDates, defaultInterval, minInterval, maxInterval)
		assert.Equal(t, interval, maxInterval, "Should be capped at maxInterval")
	})

	t.Run("fewer than 2 items", func(t *testing.T) {
		pubDates := []time.Time{time.Now()}
		interval := CalculateAdaptiveInterval(pubDates, defaultInterval, minInterval, maxInterval)
		assert.Equal(t, interval, defaultInterval, "Should fallback to defaultInterval")

		interval = CalculateAdaptiveInterval([]time.Time{}, defaultInterval, minInterval, maxInterval)
		assert.Equal(t, interval, defaultInterval, "Should fallback to defaultInterval")
	})

	t.Run("average calculation", func(t *testing.T) {
		now := time.Now()
		// 30 min, 60 min intervals -> average 45 min
		pubDates := []time.Time{
			now,
			now.Add(-30 * time.Minute),
			now.Add(-90 * time.Minute),
		}
		interval := CalculateAdaptiveInterval(pubDates, defaultInterval, minInterval, maxInterval)
		assert.Equal(t, interval, 45*time.Minute)
	})

	t.Run("last 10 items", func(t *testing.T) {
		now := time.Now()
		pubDates := make([]time.Time, 15)
		for i := 0; i < 15; i++ {
			// Every 30 minutes
			pubDates[i] = now.Add(time.Duration(-30*i) * time.Minute)
		}
		// Even with 15 items, it should calculate based on recent ones.
		// (though in this case the interval is consistent)
		interval := CalculateAdaptiveInterval(pubDates, defaultInterval, minInterval, maxInterval)
		assert.Equal(t, interval, 30*time.Minute)
	})

	t.Run("unordered dates", func(t *testing.T) {
		now := time.Now()
		// 30 min, 60 min intervals, but unordered
		pubDates := []time.Time{
			now.Add(-30 * time.Minute),
			now,
			now.Add(-90 * time.Minute),
		}
		interval := CalculateAdaptiveInterval(pubDates, defaultInterval, minInterval, maxInterval)
		assert.Equal(t, interval, 45*time.Minute)
	})
}



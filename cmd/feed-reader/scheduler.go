package main

import (
	"context"
	"math/rand"
	"slices"
	"time"
)

// Scheduler runs a task periodically with optional jitter.
type Scheduler struct {
	interval  time.Duration
	maxJitter time.Duration
	task      Task
}

// NewScheduler creates a new Scheduler.
func NewScheduler(interval time.Duration, maxJitter time.Duration, task Task) *Scheduler {
	return &Scheduler{
		interval:  interval,
		maxJitter: maxJitter,
		task:      task,
	}
}

// Start starts the scheduler. It blocks until the context is done.
func (s *Scheduler) Start(ctx context.Context) {
	// Trigger immediately
	_ = s.task(ctx)

	for {
		delay := s.nextDelay()
		timer := time.NewTimer(delay)

		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
			_ = s.task(ctx)
		}
	}
}

func (s *Scheduler) nextDelay() time.Duration {
	delay := s.interval
	if s.maxJitter > 0 {
		jitter := time.Duration(rand.Int63n(int64(s.maxJitter)))
		delay += jitter
	}
	return delay
}

// CalculateAdaptiveInterval calculates the next fetch interval based on the average
// update frequency of the provided publication dates.
func CalculateAdaptiveInterval(pubDates []time.Time, defaultInterval, minInterval, maxInterval time.Duration) time.Duration {
	if len(pubDates) < 2 {
		return defaultInterval
	}

	// Make a copy to avoid modifying the input slice and sort descending (newest first)
	dates := make([]time.Time, len(pubDates))
	copy(dates, pubDates)
	slices.SortFunc(dates, func(a, b time.Time) int {
		if a.After(b) {
			return -1
		}
		if a.Before(b) {
			return 1
		}
		return 0
	})

	// Use at most the last 10 items
	count := len(dates)
	if count > 10 {
		count = 10
	}

	avgInterval := dates[0].Sub(dates[count-1]) / time.Duration(count-1)

	if avgInterval < minInterval {
		return minInterval
	}
	if avgInterval > maxInterval {
		return maxInterval
	}

	return avgInterval
}


package main

import (
	"context"
	"math/rand"
	"slices"
	"time"

	"github.com/nakatanakatana/feed-reader/store"
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
	count := min(len(dates), 10)

	avgInterval := dates[0].Sub(dates[count-1]) / time.Duration(count-1)

	if avgInterval < minInterval {
		return minInterval
	}
	if avgInterval > maxInterval {
		return maxInterval
	}

	return avgInterval
}

// AdjustIntervalForPeak reduces the interval if the next fetch time falls into a peak period.
func AdjustIntervalForPeak(distribution []store.UpdateDistributionRow, baseInterval, minInterval time.Duration, nextFetchTime time.Time) time.Duration {
	if len(distribution) == 0 {
		return baseInterval
	}

	dow := int(nextFetchTime.Weekday())
	hour := nextFetchTime.Hour()

	var currentCount int
	var maxCount int
	for _, row := range distribution {
		if row.DayOfWeek == dow && row.HourOfDay == hour {
			currentCount = row.Count
		}
		if row.Count > maxCount {
			maxCount = row.Count
		}
	}

	if currentCount == 0 {
		return baseInterval
	}

	// Peak definition:
	// 1. Has at least 2 items.
	// 2. Has at least 50% of the maximum items seen in any single bucket.
	if currentCount >= 2 && float64(currentCount) >= float64(maxCount)*0.5 {
		// Reduce interval to increase frequency.
		adjusted := baseInterval / 2
		if adjusted < minInterval {
			return minInterval
		}
		return adjusted
	}

	return baseInterval
}

package main

import (
	"context"
	"math/rand"
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

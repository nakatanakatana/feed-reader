package main

import (
	"context"
	"time"
)

// Scheduler runs a task periodically.
type Scheduler struct {
	interval time.Duration
	task     Task
}

// NewScheduler creates a new Scheduler.
func NewScheduler(interval time.Duration, task Task) *Scheduler {
	return &Scheduler{
		interval: interval,
		task:     task,
	}
}

// Start starts the scheduler. It blocks until the context is done.
func (s *Scheduler) Start(ctx context.Context) {
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	// Trigger immediately
	_ = s.task(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			_ = s.task(ctx)
		}
	}
}

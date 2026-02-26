package main

import (
	"context"
	"sync"

	"go.opentelemetry.io/otel"
)

// Task represents a unit of work to be executed by the worker pool.
type Task func(ctx context.Context) error

// WorkerPool manages a pool of workers to execute tasks concurrently.
type WorkerPool struct {
	maxWorkers int
	tasks      chan Task
	wg         sync.WaitGroup
}

// NewWorkerPool creates a new WorkerPool with the specified number of workers.
func NewWorkerPool(maxWorkers int) *WorkerPool {
	return &WorkerPool{
		maxWorkers: maxWorkers,
		tasks:      make(chan Task),
	}
}

// Start initializes the workers and starts processing tasks.
func (wp *WorkerPool) Start(ctx context.Context) {
	for i := 0; i < wp.maxWorkers; i++ {
		wp.wg.Go(func() {
			for task := range wp.tasks {
				// Each task execution gets its own span
				func() {
					tracer := otel.GetTracerProvider().Tracer("worker_pool")
					taskCtx, span := tracer.Start(ctx, "worker_pool.task")
					defer span.End()
					_ = task(taskCtx) // Errors are handled within the task or ignored here
				}()
			}
		})
	}
}

// AddTask adds a task to the pool.
func (wp *WorkerPool) AddTask(task Task) {
	wp.tasks <- task
}

// Wait blocks until all workers have finished (after the channel is closed).
// Note: This implementation assumes the caller closes the tasks channel or cancels context.
func (wp *WorkerPool) Wait() {
	close(wp.tasks)
	wp.wg.Wait()
}

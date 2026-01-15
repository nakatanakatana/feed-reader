package main

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestWorkerPool_Concurrency(t *testing.T) {
	maxWorkers := 3
	wp := NewWorkerPool(maxWorkers)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	wp.Start(ctx)

	totalTasks := 10
	var activeWorkers int32
	var maxActiveWorkers int32
	var completedTasks int32
	var wg sync.WaitGroup

	wg.Add(totalTasks)

	for i := 0; i < totalTasks; i++ {
		wp.AddTask(func(ctx context.Context) error {
			defer wg.Done()
			
			current := atomic.AddInt32(&activeWorkers, 1)
			
			// Update max active workers if current is higher
			// This is a simple check, theoretically there's a race here but strictly for 
			// checking if we exceeded the limit significantly it works.
			// A better way is using a lock for the max check.
			for {
				max := atomic.LoadInt32(&maxActiveWorkers)
				if current <= max {
					break
				}
				if atomic.CompareAndSwapInt32(&maxActiveWorkers, max, current) {
					break
				}
			}

			time.Sleep(10 * time.Millisecond) // Simulate work
			
			atomic.AddInt32(&activeWorkers, -1)
			atomic.AddInt32(&completedTasks, 1)
			return nil
		})
	}

	wp.Wait() // This closes the channel and waits

	assert.Equal(t, int32(totalTasks), completedTasks)
	assert.LessOrEqual(t, maxActiveWorkers, int32(maxWorkers), "Should not exceed max workers")
}

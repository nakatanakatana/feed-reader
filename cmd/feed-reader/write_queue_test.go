package main

import (
	"testing"
	"time"
)

func TestWriteQueueJobInterface(t *testing.T) {
	var _ WriteQueueJob = (*SaveItemsJob)(nil)
	var _ WriteQueueJob = (*UpdateFeedJob)(nil)
}

func TestNewWriteQueueService(t *testing.T) {
	cfg := WriteQueueConfig{
		MaxBatchSize:  10,
		FlushInterval: 100 * time.Millisecond,
	}
	s := NewWriteQueueService(nil, cfg, nil)
	if s == nil {
		t.Fatal("expected NewWriteQueueService to return a service")
	}
}

func TestWriteQueueServiceSubmit(t *testing.T) {
	cfg := WriteQueueConfig{
		MaxBatchSize:  10,
		FlushInterval: 100 * time.Millisecond,
	}
	s := NewWriteQueueService(nil, cfg, nil)
	job := &SaveItemsJob{}
	s.Submit(job)

	select {
	case submitted := <-s.jobs:
		if submitted != job {
			t.Errorf("expected submitted job to be the same as the original")
		}
	default:
		t.Error("expected job to be in the queue")
	}
}

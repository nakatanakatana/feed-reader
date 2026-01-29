# Specification: SQLite Write Queue Service

## Overview
Implement a write queue service to manage SQLite write operations, preventing `SQLITE_BUSY` errors during concurrent access and improving write performance. This service will batch multiple write requests and process them within a single transaction.

## Functional Requirements
- **WriteQueueService**: Provide a dedicated service that other modules (e.g., Feed Fetcher) explicitly use for write operations.
- **Batching Strategy**: Use a hybrid approach triggering writes when either a maximum count (e.g., 50 items) is reached or a timeout interval (e.g., 100ms) expires.
- **Job Abstraction**: Define specific job structs (e.g., `SaveItemsJob`, `UpdateFeedJob`) for different write operations to ensure type safety and facilitate batch optimization.
- **Asynchronous Execution (Fire-and-forget)**: Callers submit jobs to the queue and proceed without waiting for the result. The service handles execution and errors asynchronously.
- **Error Handling**: Log errors during batch processing and utilize the existing retry mechanism (`retry_db.go`) where appropriate.
- **Graceful Shutdown**: Ensure all pending jobs in the queue are processed (flushed) before the application exits.

## Non-Functional Requirements
- **Performance**: Increase throughput by reducing disk I/O through consolidated transactions.
- **Reliability**: Prevent data loss by ensuring the queue is flushed during application shutdown.
- **Integration**: Design the service to work seamlessly with `sqlc` generated queries and the existing database structure.

## Acceptance Criteria
- [ ] `WriteQueueService` can be initialized and runs as a background worker.
- [ ] Batch processing triggers correctly based on both item count and time intervals.
- [ ] Multiple write requests are consolidated into a single database transaction.
- [ ] Shutdown process ensures all queued jobs are flushed to the database.

## Out of Scope
- Queueing read (SELECT) operations.
- Synchronous error reporting to the caller.

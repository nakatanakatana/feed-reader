# Implementation Plan: Improve Adaptive Fetch Logic

## Phase 1: Research and Core Logic Design
- [ ] Task: Analyze current adaptive fetch implementation
    - [ ] Review `cmd/feed-reader/scheduler.go` and `store/feed_store.go` for existing interval calculation logic.
    - [ ] Analyze how `PublishedAt` and `CreatedAt` are currently handled in the item ingestion pipeline.
- [ ] Task: Design the Peak Analysis Query
    - [ ] Formulate an SQL query to aggregate items into 168-hour buckets (Hour of Day + Day of Week) for the last 14 days.
    - [ ] Verify performance of the query on the `item` table.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Research and Core Logic Design' (Protocol in workflow.md)

## Phase 2: Database and Calculation Logic Implementation
- [ ] Task: Implement Database Queries for Peak Analysis
    - [ ] Add a new query in `store/query.sql` to retrieve update distribution for a feed.
    - [ ] Run `sqlc generate` to update Go code.
    - [ ] Write unit tests for the new query in `store/feed_store_test.go`.
- [ ] Task: Implement Peak-Aware Interval Calculation Logic
    - [ ] Define a new function or update existing logic in `cmd/feed-reader/scheduler.go` to calculate the "peak-adjusted" interval.
    - [ ] Implement the Hybrid timestamp logic (Published At priority, then Created At).
    - [ ] Write comprehensive unit tests for the interval calculation, covering various update patterns (e.g., highly periodic vs. random).
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Database and Calculation Logic Implementation' (Protocol in workflow.md)

## Phase 3: Integration and Scheduler Update
- [ ] Task: Integrate New Logic into the Background Scheduler
    - [ ] Update the background fetch loop to use the peak-aware calculation when scheduling the next fetch.
    - [ ] Ensure that manual suspends and existing limits (15m - 24h) are respected.
    - [ ] Write integration tests in `cmd/feed-reader/scheduler_test.go` to verify scheduling behavior with simulated peak data.
- [ ] Task: Refine and Optimize
    - [ ] Adjust weights and thresholds for peak detection to ensure stable scheduling.
    - [ ] Verify that no performance regressions are introduced in the scheduler loop.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Integration and Scheduler Update' (Protocol in workflow.md)

## Phase 4: Final Validation and Documentation
- [ ] Task: Final End-to-End Verification
    - [ ] Perform a manual check of fetch schedules for active feeds to confirm peak adjustments.
    - [ ] Verify the overall system stability under the new scheduling logic.
- [ ] Task: Update Technical Documentation
    - [ ] Document the new adaptive fetch algorithm details in `README.md` or internal docs.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Validation and Documentation' (Protocol in workflow.md)

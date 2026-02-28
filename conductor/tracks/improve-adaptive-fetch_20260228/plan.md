# Implementation Plan: Improve Adaptive Fetch Logic

## Phase 1: Research and Core Logic Design [checkpoint: 5fc82e5]
- [x] Task: Analyze current adaptive fetch implementation c6f2e96
    - [x] Review `cmd/feed-reader/scheduler.go` and `store/feed_store.go` for existing interval calculation logic.
    - [x] Analyze how `PublishedAt` and `CreatedAt` are currently handled in the item ingestion pipeline.
- [x] Task: Design the Peak Analysis Query c6f2e96
    - [x] Formulate an SQL query to aggregate items into 168-hour buckets (Hour of Day + Day of Week) for the last 14 days.
    - [x] Verify performance of the query on the `item` table.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Research and Core Logic Design' (Protocol in workflow.md) 206eff9

## Phase 2: Database and Calculation Logic Implementation [checkpoint: 3c81760]
- [x] Task: Implement Database Queries for Peak Analysis f3196ac
    - [x] Add a new query in `store/query.sql` to retrieve update distribution for a feed.
    - [x] Run `sqlc generate` to update Go code.
    - [x] Write unit tests for the new query in `store/feed_store_test.go`.
- [x] Task: Implement Peak-Aware Interval Calculation Logic f3196ac
    - [x] Define a new function or update existing logic in `cmd/feed-reader/scheduler.go` to calculate the "peak-adjusted" interval.
    - [x] Implement the Hybrid timestamp logic (Published At priority, then Created At).
    - [x] Write comprehensive unit tests for the interval calculation, covering various update patterns (e.g., highly periodic vs. random).
- [x] Task: Conductor - User Manual Verification 'Phase 2: Database and Calculation Logic Implementation' (Protocol in workflow.md) 3c81760

## Phase 3: Integration and Scheduler Update [checkpoint: 00f2794]
- [x] Task: Integrate New Logic into the Background Scheduler c6e9a93
    - [x] Update the background fetch loop to use the peak-aware calculation when scheduling the next fetch.
    - [x] Ensure that manual suspends and existing limits (15m - 24h) are respected.
    - [x] Write integration tests in `cmd/feed-reader/scheduler_test.go` to verify scheduling behavior with simulated peak data.
- [x] Task: Refine and Optimize c6e9a93
    - [x] Adjust weights and thresholds for peak detection to ensure stable scheduling.
    - [x] Verify that no performance regressions are introduced in the scheduler loop.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Integration and Scheduler Update' (Protocol in workflow.md) 00f2794

## Phase 4: Final Validation and Documentation
- [ ] Task: Final End-to-End Verification
    - [ ] Perform a manual check of fetch schedules for active feeds to confirm peak adjustments.
    - [ ] Verify the overall system stability under the new scheduling logic.
- [ ] Task: Update Technical Documentation
    - [ ] Document the new adaptive fetch algorithm details in `README.md` or internal docs.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Validation and Documentation' (Protocol in workflow.md)

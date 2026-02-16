# Specification: OPML Import Performance Optimization

## Overview
Currently, importing large OPML files (e.g., hundreds of feeds) takes a significant amount of time, leading to a poor user experience. This track aims to identify the bottlenecks in the current implementation and apply optimizations primarily through database write batching and parallel processing in the Go backend.

## Functional Requirements
- **Performance Profiling**: Analyze the current OPML import process to identify precise bottlenecks (e.g., XML parsing, DB I/O, network calls for validation).
- **Parallel Processing**: Parallelize feed validation and metadata extraction using Go goroutines to utilize system resources efficiently.
- **Database Optimization**:
    - Implement bulk insertion for feeds and tags to minimize SQLite transaction overhead.
    - Optimize transaction scoping to reduce the number of disk syncs.
- **Feedback Consistency**: Ensure that even with parallel/optimized processing, the user still receives accurate success/failure counts as per the existing feature set.

## Non-Functional Requirements
- **Efficiency**: Maintain reasonable CPU and memory usage during high-concurrency import tasks.
- **Reliability**: Ensure that even if one feed fails in a bulk operation, other valid feeds are still imported correctly (or handle failures gracefully within transactions).
- **Maintainability**: Follow existing patterns for `sqlc` and database interaction.

## Acceptance Criteria
- [ ] A performance benchmark or test case for 500+ feeds shows a significant reduction in processing time (Target: at least 50% faster than current baseline).
- [ ] Large OPML files complete without hitting request timeouts.
- [ ] All feeds and associated tags from the OPML are correctly imported and persisted.
- [ ] Automated tests verify the correctness of the optimized import logic.

## Out of Scope
- Architectural changes to the background fetcher service (unless directly related to the initial deferred crawl).
- UI/UX changes to the import modal (beyond performance-related feedback if necessary).

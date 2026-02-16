# Specification: Adaptive Feed Fetching Scheduling

## Overview
This feature introduces an adaptive scheduling mechanism for feed fetching. Instead of using a fixed interval for all feeds, the system will now calculate the next fetch time based on the actual update frequency of each feed's items. This optimizes resource usage by fetching high-frequency feeds more often and reducing the load from low-frequency feeds.

## Functional Requirements

### 1. Frequency-Based Interval Calculation
- Calculate the average update interval using the publication dates (`published_at`) of the most recent items.
- Target the **last 10 items** of a feed to determine the current frequency.
- If a feed has fewer than 2 items (making interval calculation impossible), fall back to the default `fetchInterval`.

### 2. Safeguards and Constraints
- **Minimum Fetch Interval:** Regardless of high frequency, the interval will not be shorter than **15 minutes** to prevent excessive server load.
- **Maximum Fetch Interval:** Regardless of low frequency, the interval will not exceed **24 hours** to ensure feeds are checked at least once a day.
- **Manual Overrides:** Manual fetch requests from the UI will continue to bypass these scheduled intervals and reset the `nextFetch` based on the new calculation.

### 3. Background Integration
- Integrate the calculation logic into the `FetcherService` during the post-fetch processing phase.
- Update the `nextFetch` field in the database after each successful fetch or when a "Not Modified" response is received (using the calculated adaptive interval).

## Non-Functional Requirements
- **Efficiency:** The calculation should be performant and not significantly delay the fetch process.
- **Robustness:** Handle cases with missing or malformed `published_at` dates by falling back to the default interval.

## Acceptance Criteria
- [ ] Feeds with frequent updates (e.g., news sites) are scheduled for more frequent fetching (down to 15 mins).
- [ ] Feeds with rare updates are scheduled for less frequent fetching (up to 24 hours).
- [ ] A feed with no items yet uses the default configured interval.
- [ ] The `nextFetch` value stored in the database correctly reflects the calculated adaptive interval.

## Out of Scope
- User-configurable min/max intervals via the UI.
- Success/failure-based backoff (e.g., increasing interval specifically because of "Not Modified" responses).

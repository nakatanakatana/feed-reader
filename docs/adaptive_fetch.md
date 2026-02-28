# Adaptive Fetch Logic

The Feed Reader application uses an intelligent adaptive fetch system to optimize feed update frequency. The system automatically adjusts the interval between fetches for each feed based on its historical update patterns.

## Algorithm Overview

The next fetch interval is calculated using two main components:
1. **Base Interval:** Calculated from the average update frequency of recent items.
2. **Peak Adjustment:** Reduces the interval if the next fetch falls within a known high-activity period for that feed.

### 1. Base Interval Calculation

The base interval is derived from the publication dates of the **last 10 items** associated with the feed.

- **Hybrid Timestamp:** The system uses the `Published At` date from the feed if available. If not, it falls back to the `Created At` (discovery) timestamp.
- **Average Frequency:** It calculates the average time between updates for these 10 items.
- **Limits:** The resulting interval is always clamped between **15 minutes** and **24 hours**.

### 2. Peak Period Adjustment

To improve real-time delivery during active hours, the system analyzes the weekly update distribution of each feed.

- **168-Hour Distribution:** The system aggregates all items published/discovered in the **last 14 days** into 1-hour buckets corresponding to a weekly cycle (24 hours * 7 days).
- **Peak Identification:** A bucket is considered a "peak" if it meets both criteria:
    - It contains at least **2 items**.
    - It contains at least **50% of the items** seen in the most active bucket for that feed.
- **Interval Reduction:** If the next scheduled fetch (based on the Base Interval) falls into a peak bucket, the **interval is halved**. This increases the fetch frequency during periods when the feed is historically active.

## Implementation Details

- **Database:** Uses efficient SQL queries to aggregate update history without significant performance impact on the background scheduler.
- **Scheduler:** The background fetcher re-calculates the optimal interval after every successful fetch or when a feed is not modified (304 Not Modified).
- **Manual Control:** Manual feed refreshes and suspends always take precedence over the adaptive schedule.

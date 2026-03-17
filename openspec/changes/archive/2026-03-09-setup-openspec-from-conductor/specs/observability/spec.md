## ADDED Requirements

### Requirement: Distributed Tracing with OTEL

The system SHALL support distributed tracing using OpenTelemetry (OTEL) for both backend and frontend.

#### Scenario: Trace request from frontend to backend

- **WHEN** a user initiates an action in the frontend
- **THEN** the system SHALL generate and propagate a trace ID across the API boundary into the backend and down to the database level.

### Requirement: Background Task Monitoring

The system SHALL monitor the execution time and performance of background worker tasks such as feed fetching and ingestion.

#### Scenario: Track background worker execution

- **WHEN** a background worker starts a feed fetch task
- **THEN** the task duration and outcome SHALL be recorded and reported to the OTEL collector.

### Requirement: Frontend Performance Metrics (Core Web Vitals)

The system SHALL automatically capture and report Core Web Vitals (LCP, FCP, CLS) to monitor frontend performance.

#### Scenario: Report Core Web Vitals

- **WHEN** the frontend application is loaded in a user's browser
- **THEN** it SHALL collect and report standardized performance metrics to the OTEL collector.

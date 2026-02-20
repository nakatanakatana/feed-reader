# Specification: Enable HTTP GET for Idempotent RPCs

## Overview
This track aims to enable HTTP GET for all side-effect-free (idempotent) RPC methods across the application. This involves updating Protobuf definitions to mark these methods and configuring the Connect-Web frontend to utilize GET requests for these marked methods. This will improve performance by allowing for browser-level and potential CDN caching.

## Detailed Requirements

### 1. Protobuf Definition Audit & Updates
- **Audit:** Conduct a comprehensive review of all Protobuf service definitions to identify every method that does not modify the application state (read-only).
- **Target Files:**
    - `proto/feed/v1/feed.proto`
    - `proto/item/v1/item.proto`
    - `proto/tag/v1/tag.proto`
- **Updates:** For each identified idempotent method, add the following options:
    - `option (google.api.http).get = "...";` (if using standard HTTP mapping)
    - `option idempotency_level = IDEMPOTENT;` (standard Protobuf idempotency indicator)
    - Specifically, ensure all methods starting with `Get*` or `List*` are included.

### 2. Server-Side Implementation Audit
- Review the Go backend implementations for the following services to confirm they are indeed side-effect-free:
    - `cmd/feed-reader/handler.go` (FeedService)
    - `cmd/feed-reader/item_handler.go` (ItemService)
    - `cmd/feed-reader/tag_service.go` (TagService)
- Ensure that methods identified as idempotent do not perform any write operations (INSERT, UPDATE, DELETE) to the SQLite database.

### 3. Frontend Configuration Updates
- **Target File:** `frontend/src/config.ts` (or the location where Connect-Web transport is initialized).
- **Update:** Enable the `useHttpGet` flag in the `createConnectTransport` configuration.
- Ensure that the frontend correctly handles GET requests, including proper encoding of request parameters in the URL.

### 4. Verification & Testing
- **Automated Tests:**
    - Add or update frontend integration tests to intercept network requests (using MSW) and verify that the `method` is `GET` for the targeted RPC calls.
    - Add backend tests if necessary to ensure that the generated Connect handlers correctly process GET requests.
- **Manual Verification:**
    - Use browser developer tools (Network tab) to confirm that read-only requests are being sent as `GET` instead of `POST`.

## Functional Requirements
- Enable HTTP GET support in the Connect-Web transport.
- Mark all read-only RPC methods as idempotent in `.proto` files.
- Ensure that request parameters for GET requests are correctly serialized into the URL query string.

## Acceptance Criteria
- All read-only RPC methods (e.g., `ListFeeds`, `GetItem`, `ListItems`) are sent as HTTP GET requests from the frontend.
- All non-read-only RPC methods (e.g., `CreateFeed`, `UpdateItem`, `DeleteTag`) continue to use HTTP POST.
- Request parameters for GET requests are correctly received and processed by the backend.
- Automated tests confirm the use of the `GET` method for read-only RPCs.

## Out of Scope
- Implementing server-side caching headers (e.g., `Cache-Control`).
- Refactoring methods to make them idempotent.

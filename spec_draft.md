# Track Specification: CORS Support in Backend

## Overview
Currently, the backend doesn't support Cross-Origin Resource Sharing (CORS). This track will implement CORS support, allowing the backend to return `Access-Control-Allow-Origin` and `Access-Control-Allow-Headers` based on an environment variable.

## Functional Requirements
- **Configuration:** Add a new environment variable `CORS_ALLOWED_ORIGINS` to the backend configuration. This variable should accept a comma-separated list of origins.
- **Header Injection:** If `CORS_ALLOWED_ORIGINS` is provided, the backend must include the following headers in responses:
    - `Access-Control-Allow-Origin`: The origin that matches the request's `Origin` header (if it's in the allowed list) or the first origin from the list (if applicable).
    - `Access-Control-Allow-Headers`: Should include common headers used by Connect RPC (e.g., `Connect-Protocol-Version`, `Content-Type`, `Authorization`).
- **Preflight Support:** Handle `OPTIONS` (preflight) requests correctly by returning a 204 No Content status with the appropriate CORS headers.
- **Zero-Config Default:** If `CORS_ALLOWED_ORIGINS` is empty or not set, no CORS headers should be added, maintaining existing behavior.

## Non-Functional Requirements
- **Security:** Ensure that only explicitly allowed origins can access the API.
- **Maintainability:** Use manual implementation instead of external libraries to keep the dependency footprint small.

## Acceptance Criteria
- [ ] `CORS_ALLOWED_ORIGINS` environment variable is parsed as a string slice in the `config` struct.
- [ ] For a request with an `Origin` header that matches one of the `CORS_ALLOWED_ORIGINS`:
    - The response contains `Access-Control-Allow-Origin` with the matching origin.
    - The response contains `Access-Control-Allow-Headers`.
- [ ] For an `OPTIONS` request with an `Origin` header that matches one of the `CORS_ALLOWED_ORIGINS`:
    - The response returns status `204 No Content`.
    - The response contains the appropriate CORS headers.
- [ ] If `CORS_ALLOWED_ORIGINS` is not set:
    - No `Access-Control-Allow-Origin` or `Access-Control-Allow-Headers` headers are present in the response.
- [ ] Unit tests verify the CORS middleware logic.

## Out of Scope
- Support for `Access-Control-Allow-Credentials`.
- Support for `Access-Control-Expose-Headers`.
- Frontend-side CORS configuration.

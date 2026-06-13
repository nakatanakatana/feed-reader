# TypeSpec API Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the frontend runtime dependency on Connect/protobuf with a TypeSpec-authored JSON API while preserving existing backend behavior and proving server/client parity before each cutover.

**Architecture:** TypeSpec is the API source of truth. The build generates a committed OpenAPI document, Go `net/http` server adapter/types with `oapi-codegen`, and frontend TypeScript API types with `openapi-typescript`; the backend initially runs generated JSON handlers alongside existing Connect handlers until the frontend is migrated.

**Tech Stack:** TypeSpec, `@typespec/openapi3`, `oapi-codegen` with `types,std-http,strict-server`, `openapi-typescript`, lightweight fetch wrapper, Go `net/http`, Solid/TanStack Query.

---

## File Structure

- Create `api/main.tsp`: TypeSpec service definition for feeds, tags, items, block rules, OPML, and read-status sync.
- Create `api/tspconfig.yaml`: TypeSpec OpenAPI emitter configuration.
- Create `api/openapi.yaml`: generated and committed OpenAPI output.
- Create `gen/openapi/server.gen.go`: generated Go types and strict `net/http` server adapter.
- Create `frontend/src/lib/api/types.ts`: generated TypeScript OpenAPI types.
- Create `frontend/src/lib/api/json-client.ts`: tiny typed fetch wrapper with API error handling.
- Create `cmd/feed-reader/openapi_handler.go`: generated API implementation adapter calling existing store/service logic.
- Create `cmd/feed-reader/openapi_handler_test.go`: backend handler tests for representative generated API endpoints.
- Create `cmd/feed-reader/api_parity_test.go`: side-by-side tests comparing existing Connect handlers and OpenAPI handlers against the same fixtures.
- Create `frontend/src/lib/api/parity.test.ts`: frontend mapper/client parity tests using Connect-shaped and OpenAPI-shaped payloads.
- Modify `cmd/feed-reader/main.go`: mount generated JSON API routes under `/api/v2` first, then later replace Connect routes.
- Modify `package.json`: add TypeSpec/OpenAPI generation scripts and frontend client dependency if needed.
- Modify `Makefile`: add `gen-api`, wire it into `gen`.
- Modify frontend data modules:
  - `frontend/src/lib/feed-db.ts`
  - `frontend/src/lib/item-db.ts`
  - `frontend/src/lib/tag-db.ts`
  - `frontend/src/lib/block-db.ts`
  - `frontend/src/components/ImportOpmlModal.tsx`
- Later remove frontend Connect/protobuf files/dependencies:
  - `frontend/src/gen/**`
  - `@bufbuild/protobuf`
  - `@connectrpc/connect`
  - `@connectrpc/connect-web`

## API Design Rules

- TypeSpec `.tsp` files are the source of truth.
- Commit generated `api/openapi.yaml`, `gen/openapi/server.gen.go`, and `frontend/src/lib/api/types.ts`.
- Avoid `oneOf`/`anyOf` in response bodies.
- Model errors with HTTP status responses, not success-body unions.
- Use `utcDateTime` for timestamps.
- Use `bytes` for OPML payloads; OpenAPI emits `format: byte`, Go gets `[]byte`, TypeScript sees base64 `string`.
- Represent `int64` JSON values as `string` to preserve frontend `BigInt(...)` behavior.
- Keep generated Go types at the HTTP boundary; convert to existing internal store/service types.
- Keep Connect and `/api/v2` routes side-by-side until every migrated endpoint has parity coverage.

## Parity Verification Rules

- Compare behavior, not wire format.
- Normalize timestamps to RFC3339/ISO strings before comparing.
- Normalize `int64` values to decimal strings before comparing.
- Normalize bytes as base64 strings before comparing.
- Use the same test DB fixture and store/service dependencies for Connect and OpenAPI handlers.
- Do not delete a Connect endpoint until its OpenAPI replacement has backend parity, frontend mapper parity, and at least one integration or route test covering the migrated UI path.

---

### Task 1: Add Generation Tooling

**Files:**
- Modify: `package.json`
- Modify: `Makefile`
- Create: `api/tspconfig.yaml`
- Test: generation commands only

- [ ] **Step 1: Add TypeSpec and OpenAPI TypeScript dev dependencies**

Run:

```bash
npm install --save-dev @typespec/compiler @typespec/http @typespec/openapi3 openapi-typescript
```

Expected: `package.json` and `package-lock.json` include the new dev dependencies.

- [ ] **Step 2: Add generation scripts**

Update `package.json` scripts with:

```json
{
  "scripts": {
    "gen:openapi": "tsp compile api",
    "gen:api-types": "openapi-typescript api/openapi.yaml -o frontend/src/lib/api/types.ts"
  }
}
```

Preserve existing scripts.

- [ ] **Step 3: Add TypeSpec emitter config**

Create `api/tspconfig.yaml`:

```yaml
emit:
  - "@typespec/openapi3"
options:
  "@typespec/openapi3":
    emitter-output-dir: "{project-root}/api"
    output-file: openapi.yaml
```

- [ ] **Step 4: Add Makefile target**

Update `Makefile`:

```make
.PHONY: gen-api

gen-api:
	npm run gen:openapi
	go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@v2.7.1 -generate types,std-http,strict-server -package openapi -o gen/openapi/server.gen.go api/openapi.yaml
	npm run gen:api-types

gen: gen-buf gen-sqlc gen-api
```

During the final Connect removal task, remove `gen-buf` from `gen`.

- [ ] **Step 5: Run generation command and confirm expected initial failure**

Run:

```bash
make gen-api
```

Expected: fails because `api/main.tsp` does not exist yet.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json Makefile api/tspconfig.yaml
git commit -m "build(api): add TypeSpec generation tooling"
```

---

### Task 2: Define Initial TypeSpec Contract

**Files:**
- Create: `api/main.tsp`
- Create generated: `api/openapi.yaml`
- Create generated: `gen/openapi/server.gen.go`
- Create generated: `frontend/src/lib/api/types.ts`
- Test: `make gen-api`, `go test ./gen/openapi`

- [ ] **Step 1: Create initial TypeSpec model and read endpoints**

Create `api/main.tsp` with feeds, tags, items, common error, and read-only operations:

```typespec
import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

@service(#{ title: "Feed Reader API" })
@server("/api/v2")
namespace FeedReader;

alias DateTime = utcDateTime;
alias Int64String = string;

model ApiError {
  code: string;
  message: string;
}

model ErrorResponse {
  @statusCode statusCode: 500;
  @body body: ApiError;
}

model Tag {
  id: string;
  name: string;
  createdAt: DateTime;
  updatedAt: DateTime;
  unreadCount: Int64String;
  feedCount: Int64String;
}

model Feed {
  id: string;
  url: string;
  link?: string;
  title: string;
  lastFetchedAt?: DateTime;
  nextFetchAt?: DateTime;
  createdAt: DateTime;
  updatedAt: DateTime;
  tags: Tag[];
  unreadCount: Int64String;
}

model Item {
  id: string;
  url: string;
  title: string;
  description: string;
  publishedAt: DateTime;
  feedId: string;
  isRead: boolean;
  author: string;
  content: string;
  imageUrl: string;
  categories: string;
  createdAt: DateTime;
}

model ListFeedsResponse {
  feeds: Feed[];
}

model ListTagsResponse {
  tags: Tag[];
  totalUnreadCount: Int64String;
}

model ListItemsResponse {
  items: Item[];
  nextPageToken: string;
}

model GetItemResponse {
  item?: Item;
}

@route("/feeds")
namespace Feeds {
  @get
  op list(@query tagId?: string): ListFeedsResponse | ErrorResponse;
}

@route("/tags")
namespace Tags {
  @get
  op list(): ListTagsResponse | ErrorResponse;
}

@route("/items")
namespace Items {
  @get
  op list(
    @query feedId?: string,
    @query isRead?: boolean,
    @query tagId?: string,
    @query since?: DateTime,
    @query pageSize?: int32,
    @query pageToken?: string,
  ): ListItemsResponse | ErrorResponse;

  @get
  @route("/{id}")
  op get(@path id: string): GetItemResponse | ErrorResponse;
}
```

- [ ] **Step 2: Generate OpenAPI and code**

Run:

```bash
make gen-api
```

Expected: succeeds and creates `api/openapi.yaml`, `gen/openapi/server.gen.go`, and `frontend/src/lib/api/types.ts`.

- [ ] **Step 3: Compile generated Go package**

Run:

```bash
go test ./gen/openapi
```

Expected: PASS or `[no test files]`.

- [ ] **Step 4: Inspect OpenAPI for response status split**

Run:

```bash
rg "anyOf|oneOf" api/openapi.yaml
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add api/main.tsp api/openapi.yaml gen/openapi/server.gen.go frontend/src/lib/api/types.ts package.json package-lock.json
git commit -m "feat(api): define initial TypeSpec contract"
```

---

### Task 3: Add Backend Read API Adapter

**Files:**
- Create: `cmd/feed-reader/openapi_handler.go`
- Create: `cmd/feed-reader/openapi_handler_test.go`
- Modify: `cmd/feed-reader/main.go`
- Test: `go test ./cmd/feed-reader -run 'TestOpenAPI'`

- [ ] **Step 1: Write failing backend test for `/api/v2/tags`**

Create `cmd/feed-reader/openapi_handler_test.go`:

```go
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/nakatanakatana/feed-reader/gen/openapi"
	"github.com/nakatanakatana/feed-reader/store"
	"gotest.tools/v3/assert"
)

func TestOpenAPIListTags(t *testing.T) {
	ctx := context.Background()
	db := setupTestDB(t)
	s := store.NewStore(db)

	tag, err := s.CreateTag(ctx, "Tech")
	assert.NilError(t, err)
	assert.Assert(t, tag.ID != "")

	handler := openapi.HandlerFromMux(
		openapi.NewStrictHandler(NewOpenAPIHandler(s), nil),
		http.NewServeMux(),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v2/tags", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusOK)

	var body openapi.ListTagsResponse
	err = json.Unmarshal(rec.Body.Bytes(), &body)
	assert.NilError(t, err)
	assert.Equal(t, len(body.Tags), 1)
	assert.Equal(t, body.Tags[0].Name, "Tech")
}

func setupTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := store.OpenDB(":memory:")
	assert.NilError(t, err)
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func ptrTime(t time.Time) *time.Time {
	return &t
}
```

Adjust helper names only if existing tests already provide a project-standard DB helper.

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
go test ./cmd/feed-reader -run TestOpenAPIListTags
```

Expected: FAIL because `NewOpenAPIHandler` is undefined.

- [ ] **Step 3: Implement minimal OpenAPI handler**

Create `cmd/feed-reader/openapi_handler.go`:

```go
package main

import (
	"context"
	"strconv"

	"github.com/nakatanakatana/feed-reader/gen/openapi"
	"github.com/nakatanakatana/feed-reader/store"
)

type OpenAPIHandler struct {
	store *store.Store
}

func NewOpenAPIHandler(s *store.Store) *OpenAPIHandler {
	return &OpenAPIHandler{store: s}
}

func (h *OpenAPIHandler) TagsList(ctx context.Context, request openapi.TagsListRequestObject) (openapi.TagsListResponseObject, error) {
	tags, totalUnread, err := h.store.ListTagsWithUnreadCounts(ctx)
	if err != nil {
		return openapi.TagsList500JSONResponse{
			Code:    "internal",
			Message: err.Error(),
		}, nil
	}

	response := openapi.ListTagsResponse{
		Tags:             make([]openapi.Tag, 0, len(tags)),
		TotalUnreadCount: strconv.FormatInt(totalUnread, 10),
	}
	for _, tag := range tags {
		response.Tags = append(response.Tags, openapi.Tag{
			Id:          tag.ID,
			Name:        tag.Name,
			CreatedAt:   tag.CreatedAt,
			UpdatedAt:   tag.UpdatedAt,
			UnreadCount: strconv.FormatInt(tag.UnreadCount, 10),
			FeedCount:   strconv.FormatInt(tag.FeedCount, 10),
		})
	}

	return openapi.TagsList200JSONResponse(response), nil
}
```

If `ListTagsWithUnreadCounts` has a different local name, use the existing method that currently backs `TagServer.ListTags`.

- [ ] **Step 4: Add stub methods required by `StrictServerInterface`**

In `cmd/feed-reader/openapi_handler.go`, add:

```go
func (h *OpenAPIHandler) FeedsList(ctx context.Context, request openapi.FeedsListRequestObject) (openapi.FeedsListResponseObject, error) {
	return openapi.FeedsList500JSONResponse{Code: "not_implemented", Message: "feeds endpoint is not implemented yet"}, nil
}

func (h *OpenAPIHandler) ItemsList(ctx context.Context, request openapi.ItemsListRequestObject) (openapi.ItemsListResponseObject, error) {
	return openapi.ItemsList500JSONResponse{Code: "not_implemented", Message: "items endpoint is not implemented yet"}, nil
}

func (h *OpenAPIHandler) ItemsGet(ctx context.Context, request openapi.ItemsGetRequestObject) (openapi.ItemsGetResponseObject, error) {
	return openapi.ItemsGet500JSONResponse{Code: "not_implemented", Message: "item endpoint is not implemented yet"}, nil
}
```

Use exact generated method names from `gen/openapi/server.gen.go`.

- [ ] **Step 5: Mount generated API under `/api/v2`**

Modify `cmd/feed-reader/main.go` `NewMux` after existing Connect handlers:

```go
openAPIHandler := openapi.HandlerFromMux(
	openapi.NewStrictHandler(NewOpenAPIHandler(s), nil),
	mux,
)
_ = openAPIHandler
```

If `HandlerFromMux` already registers on the provided mux and returns it, keep the returned handler unused only if required by generated signature. Import `github.com/nakatanakatana/feed-reader/gen/openapi`.

- [ ] **Step 6: Run backend tests**

Run:

```bash
go test ./cmd/feed-reader -run TestOpenAPIListTags
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add cmd/feed-reader/openapi_handler.go cmd/feed-reader/openapi_handler_test.go cmd/feed-reader/main.go
git commit -m "feat(api): add generated JSON read adapter"
```

---

### Task 3.5: Add Backend Read Parity Tests

**Files:**
- Create: `cmd/feed-reader/api_parity_test.go`
- Test: `go test ./cmd/feed-reader -run TestAPIParity`

- [ ] **Step 1: Add response normalization helpers**

Create helpers that execute the existing Connect handler and the new OpenAPI handler against the same seeded store, then normalize the response into comparable structs:

```go
func normalizeTime(t time.Time) string {
	return t.UTC().Format(time.RFC3339Nano)
}

func normalizeInt64(v int64) string {
	return strconv.FormatInt(v, 10)
}
```

Avoid comparing raw JSON/protobuf payloads directly. The contract to preserve is the application-level response shape after timestamps, integer widths, and byte encodings are normalized.

- [ ] **Step 2: Add tag list parity test**

Add a test that:

1. Seeds the same tags/feeds/items fixture.
2. Calls the existing Connect `ListTags` path.
3. Calls `GET /api/v2/tags`.
4. Converts both responses to the frontend-observable shape.
5. Asserts deep equality.

Name it:

```go
func TestAPIParityListTags(t *testing.T) { ... }
```

- [ ] **Step 3: Add feed and item read parity tests**

Add at least:

```go
func TestAPIParityListFeeds(t *testing.T) { ... }
func TestAPIParityListItems(t *testing.T) { ... }
func TestAPIParityGetItem(t *testing.T) { ... }
```

Use the same fixture setup for Connect and OpenAPI in each test.

- [ ] **Step 4: Run parity tests**

Run:

```bash
go test ./cmd/feed-reader -run TestAPIParity
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cmd/feed-reader/api_parity_test.go
git commit -m "test(api): add read parity coverage"
```

---

### Task 4: Add Typed Frontend JSON Client

**Files:**
- Create: `frontend/src/lib/api/json-client.ts`
- Create: `frontend/src/lib/api/json-client.test.ts`
- Test: `npm run test -- src/lib/api/json-client.test.ts`

- [ ] **Step 1: Write failing client tests**

Create `frontend/src/lib/api/json-client.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "./json-client";

describe("createApiClient", () => {
  it("returns JSON for successful responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ tags: [], totalUnreadCount: "0" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createApiClient({ baseUrl: "/api/v2", fetch: fetchMock });
    const result = await client.get("/tags");

    expect(result).toEqual({ tags: [], totalUnreadCount: "0" });
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/tags", {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: undefined,
    });
  });

  it("throws ApiError for JSON error responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: "internal", message: "boom" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createApiClient({ baseUrl: "/api/v2", fetch: fetchMock });

    await expect(client.get("/tags")).rejects.toEqual(
      new ApiError("internal", "boom", 500),
    );
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npm run test -- src/lib/api/json-client.test.ts
```

Expected: FAIL because `json-client.ts` does not exist.

- [ ] **Step 3: Implement minimal client**

Create `frontend/src/lib/api/json-client.ts`:

```ts
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type FetchLike = typeof fetch;

interface ApiClientOptions {
  baseUrl: string;
  fetch?: FetchLike;
}

interface RequestOptions {
  signal?: AbortSignal;
}

const joinUrl = (baseUrl: string, path: string) =>
  `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

const parseJson = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return undefined;
  return response.json();
};

export const createApiClient = (options: ApiClientOptions) => {
  const fetchImpl = options.fetch ?? fetch;

  const request = async <T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: unknown,
    requestOptions?: RequestOptions,
  ): Promise<T> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    let requestBody: string | undefined;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    }

    const response = await fetchImpl(joinUrl(options.baseUrl, path), {
      method,
      headers,
      signal: requestOptions?.signal,
      ...(requestBody !== undefined ? { body: requestBody } : {}),
    });
    const json = await parseJson(response);

    if (!response.ok) {
      const error = json as { code?: string; message?: string } | undefined;
      throw new ApiError(
        error?.code ?? "unknown",
        error?.message ?? "Request failed",
        response.status,
      );
    }

    return json as T;
  };

  return {
    get: <T>(path: string, options?: RequestOptions) =>
      request<T>("GET", path, undefined, options),
    post: <T>(path: string, body: unknown, options?: RequestOptions) =>
      request<T>("POST", path, body, options),
    delete: <T>(path: string, options?: RequestOptions) =>
      request<T>("DELETE", path, undefined, options),
  };
};
```

- [ ] **Step 4: Run test**

Run:

```bash
npm run test -- src/lib/api/json-client.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api/json-client.ts frontend/src/lib/api/json-client.test.ts
git commit -m "feat(frontend): add typed JSON API client"
```

---

### Task 5: Migrate Frontend Read Paths

**Files:**
- Modify: `frontend/src/lib/feed-db.ts`
- Modify: `frontend/src/lib/item-db.ts`
- Modify: `frontend/src/lib/tag-db.ts`
- Create: `frontend/src/lib/api/parity.test.ts`
- Test: existing frontend tests for feed/item/tag lists

- [ ] **Step 1: Add shared API client instance**

Create `frontend/src/lib/api/client.ts`:

```ts
import { createApiClient } from "./json-client";

export const apiClient = createApiClient({ baseUrl: "/api/v2" });
```

- [ ] **Step 2: Update tag data reads**

In `frontend/src/lib/tag-db.ts`, replace `createClient(TagService, transport)` reads with:

```ts
import type { components } from "./api/types";
import { apiClient } from "./api/client";

type ListTagsResponse = components["schemas"]["ListTagsResponse"];

const response = await apiClient.get<ListTagsResponse>("/tags");
```

Map `unreadCount` and `feedCount` with `BigInt(tag.unreadCount)`.

- [ ] **Step 3: Run tag tests**

Run:

```bash
npm run test -- src/components/TagManagement.test.tsx src/components/FeedList.FeedCount.test.tsx
```

Expected: tests fail only where mocks still target Connect endpoints.

- [ ] **Step 4: Update MSW mocks for read endpoints**

Modify `frontend/src/mocks/handlers.ts` to add REST handlers for:

```ts
http.get("*/api/v2/tags", ...)
http.get("*/api/v2/feeds", ...)
http.get("*/api/v2/items", ...)
http.get("*/api/v2/items/:id", ...)
```

Return plain JSON, not protobuf `toJson(...)`.

- [ ] **Step 5: Update feeds and items reads**

In `feed-db.ts` and `item-db.ts`, use generated response types:

```ts
type ListFeedsResponse = components["schemas"]["ListFeedsResponse"];
type ListItemsResponse = components["schemas"]["ListItemsResponse"];
type GetItemResponse = components["schemas"]["GetItemResponse"];
```

Use `apiClient.get` with query strings built via `URLSearchParams`.

- [ ] **Step 6: Run frontend read tests**

Run:

```bash
npm run test -- src/components/FeedList.test.tsx src/components/ItemList.test.tsx src/components/ItemDetailModal.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Add frontend read mapper parity tests**

Create `frontend/src/lib/api/parity.test.ts` with focused tests for the mapping layer used by `tag-db.ts`, `feed-db.ts`, and `item-db.ts`.

For each migrated read path, compare the old Connect-shaped input and the new OpenAPI-shaped input after they are converted to the local UI model:

```ts
expect(mapOpenAPITag(openApiTag)).toEqual(mapConnectTag(connectTag));
```

Cover:

- `unreadCount` and `feedCount` conversion to `BigInt`
- timestamp string preservation
- missing optional fields
- item detail content fields

- [ ] **Step 8: Run frontend parity tests**

Run:

```bash
npm run test -- src/lib/api/parity.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/lib/api/client.ts frontend/src/lib/api/parity.test.ts frontend/src/lib/feed-db.ts frontend/src/lib/item-db.ts frontend/src/lib/tag-db.ts frontend/src/mocks/handlers.ts
git commit -m "feat(frontend): migrate read APIs to generated JSON contract"
```

---

### Task 6: Add Write APIs to TypeSpec and Backend

**Files:**
- Modify: `api/main.tsp`
- Modify generated: `api/openapi.yaml`
- Modify generated: `gen/openapi/server.gen.go`
- Modify generated: `frontend/src/lib/api/types.ts`
- Modify: `cmd/feed-reader/openapi_handler.go`
- Test: backend write endpoint tests

- [ ] **Step 1: Extend TypeSpec with write operations**

Add models and operations for:

```typespec
model EmptyResponse {}

model CreateFeedRequest {
  url: string;
  tagIds: string[];
}

model RefreshFeedsRequest {
  ids: string[];
}

model FeedFetchStatus {
  feedId: string;
  success: boolean;
  newItemsCount: int32;
  errorMessage?: string;
}

model RefreshFeedsResponse {
  results: FeedFetchStatus[];
}

model UpdateItemStatusRequest {
  ids: string[];
  isRead?: boolean;
}
```

Add:

```typespec
@post op create(@body body: CreateFeedRequest): CreateFeedResponse | ErrorResponse;
@delete @route("/{id}") op delete(@path id: string): EmptyResponse | ErrorResponse;
@post @route("/refresh") op refresh(@body body: RefreshFeedsRequest): RefreshFeedsResponse | ErrorResponse;
```

Under `Items`, add:

```typespec
@post
@route("/status")
op updateStatus(@body body: UpdateItemStatusRequest): EmptyResponse | ErrorResponse;
```

- [ ] **Step 2: Regenerate API code**

Run:

```bash
make gen-api
```

Expected: generated files update without `oneOf`/`anyOf`.

- [ ] **Step 3: Write backend tests for write endpoints**

Add tests in `cmd/feed-reader/openapi_handler_test.go` for:

```go
func TestOpenAPICreateFeedRejectsEmptyURL(t *testing.T) { ... }
func TestOpenAPIUpdateItemStatusReturnsOK(t *testing.T) { ... }
```

Expected failures: handler methods are not implemented.

- [ ] **Step 4: Implement write adapter methods**

In `cmd/feed-reader/openapi_handler.go`, implement generated strict methods by delegating to existing logic currently used by Connect handlers.

Use `openapi.*500JSONResponse` for errors:

```go
return openapi.FeedsCreate500JSONResponse{
	Code: "invalid_argument",
	Message: "url is required",
}, nil
```

- [ ] **Step 5: Run backend tests**

Run:

```bash
go test ./cmd/feed-reader -run 'TestOpenAPI'
```

Expected: PASS.

- [ ] **Step 6: Add write parity tests**

Extend `cmd/feed-reader/api_parity_test.go` with mutation parity coverage:

```go
func TestAPIParityCreateFeedValidation(t *testing.T) { ... }
func TestAPIParityUpdateItemStatus(t *testing.T) { ... }
```

For validation cases, compare the normalized error code/message/status. For state-changing cases, execute the mutation through each handler on separate but identically seeded stores, then compare the final persisted records rather than only the immediate response.

- [ ] **Step 7: Run write parity tests**

Run:

```bash
go test ./cmd/feed-reader -run 'TestAPIParity(CreateFeedValidation|UpdateItemStatus)'
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add api/main.tsp api/openapi.yaml gen/openapi/server.gen.go frontend/src/lib/api/types.ts cmd/feed-reader/openapi_handler.go cmd/feed-reader/openapi_handler_test.go cmd/feed-reader/api_parity_test.go
git commit -m "feat(api): add JSON write endpoints"
```

---

### Task 7: Migrate Frontend Write Paths and OPML

**Files:**
- Modify: `frontend/src/lib/feed-db.ts`
- Modify: `frontend/src/lib/item-db.ts`
- Modify: `frontend/src/lib/block-db.ts`
- Modify: `frontend/src/components/ImportOpmlModal.tsx`
- Test: frontend mutation and OPML tests

- [ ] **Step 1: Add bytes helpers**

Create `frontend/src/lib/api/base64.ts`:

```ts
export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

export const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};
```

- [ ] **Step 2: Add tests for base64 helpers**

Create `frontend/src/lib/api/base64.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { base64ToBytes, bytesToBase64 } from "./base64";

describe("base64 helpers", () => {
  it("round trips bytes", () => {
    const bytes = new TextEncoder().encode("<opml></opml>");
    expect(new TextDecoder().decode(base64ToBytes(bytesToBase64(bytes)))).toBe(
      "<opml></opml>",
    );
  });
});
```

- [ ] **Step 3: Migrate feed mutations**

Replace Connect calls in `feed-db.ts`:

```ts
await apiClient.post<CreateFeedResponse>("/feeds", { url, tagIds });
await apiClient.delete<EmptyResponse>(`/feeds/${id}`);
await apiClient.post<RefreshFeedsResponse>("/feeds/refresh", { ids: feedIds });
```

- [ ] **Step 4: Migrate item status mutation**

Replace `itemClient.updateItemStatus` in `item-db.ts`:

```ts
await apiClient.post<EmptyResponse>("/items/status", { ids, isRead });
```

- [ ] **Step 5: Migrate OPML import**

In `ImportOpmlModal.tsx`, replace `client.importOpml` with:

```ts
const res = await apiClient.post<ImportOpmlResponse>("/feeds/import-opml", {
  opmlContent: bytesToBase64(content),
});
```

- [ ] **Step 6: Run frontend tests**

Run:

```bash
npm run test -- src/lib/api/base64.test.ts src/components/ImportOpmlModal.test.tsx src/components/ItemList.BulkActions.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Add OPML and mutation parity checks**

Extend `frontend/src/lib/api/base64.test.ts` to assert that an OPML byte payload produces the exact base64 string expected by OpenAPI `format: byte`, and that decoding returns the original bytes.

Extend `frontend/src/lib/api/parity.test.ts` for mutation request mapping:

```ts
expect(mapOpenAPIUpdateItemStatusRequest(input)).toEqual(
  mapConnectUpdateItemStatusRequest(input),
);
```

Cover:

- item status bulk update request shape
- feed refresh request shape
- OPML import payload base64 encoding

- [ ] **Step 8: Run mutation parity tests**

Run:

```bash
npm run test -- src/lib/api/base64.test.ts src/lib/api/parity.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/lib/api/base64.ts frontend/src/lib/api/base64.test.ts frontend/src/lib/api/parity.test.ts frontend/src/lib/feed-db.ts frontend/src/lib/item-db.ts frontend/src/components/ImportOpmlModal.tsx
git commit -m "feat(frontend): migrate mutations to JSON API"
```

---

### Task 8: Complete Remaining API Surface

**Files:**
- Modify: `api/main.tsp`
- Modify generated files
- Modify: `cmd/feed-reader/openapi_handler.go`
- Modify: `frontend/src/lib/block-db.ts`
- Modify affected tests

- [ ] **Step 1: Add block rule and URL parsing APIs to TypeSpec**

Add models:

```typespec
model URLParsingRule {
  id: string;
  domain: string;
  ruleType: string;
  pattern: string;
}

model ItemBlockRule {
  id: string;
  ruleType: string;
  value: string;
  domain?: string;
}

model AddURLParsingRuleRequest {
  domain: string;
  ruleType: string;
  pattern: string;
}

model AddItemBlockRuleInput {
  ruleType: string;
  value: string;
  domain?: string;
}

model AddItemBlockRulesRequest {
  rules: AddItemBlockRuleInput[];
}
```

Add operations under `/url-rules` and `/block-rules` with list/add/delete.

- [ ] **Step 2: Regenerate and compile**

Run:

```bash
make gen-api
go test ./gen/openapi
```

Expected: PASS.

- [ ] **Step 3: Implement backend adapter methods**

Delegate to existing item/block rule logic currently in `ItemServer`.

- [ ] **Step 4: Migrate frontend block APIs**

Update `frontend/src/lib/block-db.ts` to use `apiClient`.

- [ ] **Step 5: Run block rule tests**

Run:

```bash
npm run test -- src/routes_test/block_rules.test.tsx src/routes_test/url_rules.test.tsx src/components/BlockRulesTable.test.tsx
go test ./cmd/feed-reader -run 'TestOpenAPI.*Rule'
```

Expected: PASS.

- [ ] **Step 6: Add rule management parity tests**

Extend `cmd/feed-reader/api_parity_test.go` with:

```go
func TestAPIParityListBlockRules(t *testing.T) { ... }
func TestAPIParityAddBlockRules(t *testing.T) { ... }
func TestAPIParityURLParsingRules(t *testing.T) { ... }
```

Extend `frontend/src/lib/api/parity.test.ts` for block-rule and URL-rule mapper parity.

- [ ] **Step 7: Run rule parity tests**

Run:

```bash
go test ./cmd/feed-reader -run 'TestAPIParity.*Rule'
npm run test -- src/lib/api/parity.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add api/main.tsp api/openapi.yaml gen/openapi/server.gen.go frontend/src/lib/api/types.ts cmd/feed-reader/openapi_handler.go cmd/feed-reader/api_parity_test.go frontend/src/lib/api/parity.test.ts frontend/src/lib/block-db.ts
git commit -m "feat(api): complete rule management JSON endpoints"
```

---

### Task 9: Remove Frontend Connect Runtime

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Delete: `frontend/src/gen/**`
- Modify: tests importing `@bufbuild/protobuf` or generated protobuf schemas
- Test: frontend full test, bundle analysis

- [ ] **Step 1: Find remaining protobuf/connect imports**

Run:

```bash
rg "@bufbuild/protobuf|@connectrpc|frontend/src/gen|../gen|./gen" frontend/src package.json
```

Expected: list of remaining imports in tests and old code.

- [ ] **Step 2: Replace test mock payloads with plain JSON**

For each test using:

```ts
import { create, toJson } from "@bufbuild/protobuf";
```

replace generated protobuf object creation with plain JSON that matches `frontend/src/lib/api/types.ts`.

- [ ] **Step 3: Confirm frontend/server parity before deletion**

Run:

```bash
go test ./cmd/feed-reader -run TestAPIParity
npm run test -- src/lib/api/parity.test.ts src/lib/api/base64.test.ts
```

Expected: PASS. If this fails, do not delete `frontend/src/gen` or uninstall Connect/protobuf dependencies yet.

- [ ] **Step 4: Delete generated protobuf frontend files**

Run:

```bash
rm -rf frontend/src/gen
```

- [ ] **Step 5: Remove frontend Connect/protobuf dependencies**

Run:

```bash
npm uninstall @bufbuild/protobuf @connectrpc/connect @connectrpc/connect-web
```

Keep `@bufbuild/protoc-gen-es` until backend protobuf generation is removed; it is a dev dependency used by `buf generate`.

- [ ] **Step 6: Run frontend tests**

Run:

```bash
npm run test
```

Expected: PASS.

- [ ] **Step 7: Run bundle analysis**

Run:

```bash
npm run analyze
```

Expected: analyzer no longer reports `@bufbuild/protobuf`, `@connectrpc/connect`, or `@connectrpc/connect-web` in production chunks.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json frontend/src
git commit -m "refactor(frontend): remove Connect protobuf runtime"
```

---

### Task 10: Remove Backend Connect API

**Files:**
- Modify: `cmd/feed-reader/main.go`
- Modify: `go.mod`
- Modify: `go.sum`
- Modify: `buf.gen.yaml`
- Modify: `Makefile`
- Test: full backend/frontend tests

- [ ] **Step 1: Confirm frontend no longer calls Connect routes**

Run:

```bash
rg "feed\\.v1|item\\.v1|tag\\.v1|createClient|createConnectTransport|TransportProvider" frontend/src
```

Expected: no runtime imports or route strings remain.

- [ ] **Step 2: Confirm backend parity before removing Connect routes**

Run:

```bash
go test ./cmd/feed-reader -run TestAPIParity
```

Expected: PASS. Treat this as the final evidence that the replacement handlers match the behavior that Connect exposed.

- [ ] **Step 3: Remove Connect route registration**

In `cmd/feed-reader/main.go`, remove imports:

```go
"connectrpc.com/connect"
"github.com/nakatanakatana/feed-reader/gen/go/feed/v1/feedv1connect"
"github.com/nakatanakatana/feed-reader/gen/go/item/v1/itemv1connect"
"github.com/nakatanakatana/feed-reader/gen/go/tag/v1/tagv1connect"
```

Remove `feedv1connect.NewFeedServiceHandler`, `itemv1connect.NewItemServiceHandler`, and `tagv1connect.NewTagServiceHandler` registrations.

- [ ] **Step 4: Keep OTEL if still used**

If `otelconnect` is only used by Connect handlers, remove it from `NewMux` and use existing HTTP tracing middleware or leave OTEL DB/background tracing unchanged.

- [ ] **Step 5: Remove protobuf Go generation from `buf.gen.yaml` only after all generated Go types are unused**

Run:

```bash
rg "gen/go/.*/.*pb|feedv1|itemv1|tagv1" cmd store
```

Expected: references remain only in old Connect handlers. Remove those handlers or convert them to internal models before deleting generated Go protobuf code.

- [ ] **Step 6: Update `Makefile` generation**

Change:

```make
gen: gen-buf gen-sqlc gen-api
```

to:

```make
gen: gen-sqlc gen-api
```

only after no protobuf generation is needed.

- [ ] **Step 7: Run full verification**

Run:

```bash
make gen
go test ./...
npm run test
npm run lint
npm run analyze
```

Expected: all pass. Bundle analyzer shows Connect/protobuf frontend runtime is absent.

- [ ] **Step 8: Commit**

```bash
git add cmd go.mod go.sum buf.gen.yaml Makefile api gen frontend package.json package-lock.json
git commit -m "refactor(api): replace Connect with TypeSpec JSON API"
```

---

## CI/Review Guard

Add a final CI check once generation is stable:

```bash
make gen-api
git diff --exit-code api/openapi.yaml gen/openapi/server.gen.go frontend/src/lib/api/types.ts
```

This ensures committed generated artifacts match TypeSpec.

## Self-Review

- Spec coverage: covers TypeSpec source, committed OpenAPI, Go generation, TS generation, backend adapter, frontend migration, Connect removal, and tech-stack documentation.
- Placeholder scan: no intentional `TBD` or `TODO`; later tasks name concrete files and commands.
- Type consistency: uses `utcDateTime` -> Go `time.Time` / TS `string`, `bytes` -> Go `[]byte` / TS base64 `string`, `int64` as `string`.

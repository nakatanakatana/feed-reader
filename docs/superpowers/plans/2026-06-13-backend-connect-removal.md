# Backend Connect Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove backend Connect/protobuf v1 endpoints and serve the application API only through the TypeSpec/OpenAPI `/api/v2` JSON surface.

**Architecture:** Keep `api/main.tsp`, `api/openapi.yaml`, and `gen/openapi/server.gen.go` as the API boundary. Move backend behavior currently exposed through `FeedServer`, `ItemServer`, and `TagServer` into plain store-backed helpers used by `OpenAPIHandler`, then delete Connect service registration, generated protobuf code, and Connect dependencies.

**Tech Stack:** Go `net/http`, `oapi-codegen` strict server, TypeSpec/OpenAPI, SQLite store, Go tests.

---

## File Structure

- Modify `cmd/feed-reader/main.go`: remove Connect service registration and `otelconnect` interceptor wiring; mount only `/api/v2` plus static assets.
- Modify `cmd/feed-reader/openapi_handler.go`: remove `connectrpc.com/connect` and `gen/go/...` imports; call store/service logic directly.
- Modify or delete `cmd/feed-reader/handler.go`, `cmd/feed-reader/item_handler.go`, and `cmd/feed-reader/tag_service.go`: keep reusable non-Connect helpers only if needed by OpenAPI tests.
- Modify backend tests under `cmd/feed-reader`: replace Connect-only routing/service tests with `/api/v2` HTTP tests or remove tests that only assert Connect framework behavior.
- Modify `buf.gen.yaml`, `Makefile`, `go.mod`, and `go.sum`: remove Go protobuf/Connect generation and library dependencies once no backend code imports them.
- Delete `proto/**` and `gen/go/**` after all code references are gone.

## Task 1: Prove v1 Connect Routes Are Removed

**Files:**
- Modify: `cmd/feed-reader/routing_test.go`
- Test: `go test ./cmd/feed-reader -run TestMuxDoesNotServeConnectV1Routes`

- [ ] **Step 1: Write the failing test**

Add a test that creates `NewMux` and asserts a representative Connect v1 route returns `404 Not Found`:

```go
func TestMuxDoesNotServeConnectV1Routes(t *testing.T) {
	_, db := setupTestDB(t)
	s := store.NewStore(db)
	handler := NewMux(s, nil, nil, nil, nil)

	req := httptest.NewRequest(http.MethodPost, "/api/feed.v1.FeedService/ListFeeds", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, rec.Code, http.StatusNotFound)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
go test ./cmd/feed-reader -run TestMuxDoesNotServeConnectV1Routes
```

Expected: FAIL because the current mux still mounts the Connect v1 feed service.

- [ ] **Step 3: Remove Connect route registration**

Update `NewMux` to stop constructing `NewFeedServer`, `NewItemServer`, `NewTagServer`, and stop mounting `feedv1connect`, `itemv1connect`, and `tagv1connect` handlers.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
go test ./cmd/feed-reader -run TestMuxDoesNotServeConnectV1Routes
```

Expected: PASS.

## Task 2: Move OpenAPI Handler Off Connect Services

**Files:**
- Modify: `cmd/feed-reader/openapi_handler.go`
- Modify: `cmd/feed-reader/openapi_handler_test.go`
- Test: `go test ./cmd/feed-reader -run TestOpenAPI`

- [ ] **Step 1: Run focused OpenAPI tests**

Run:

```bash
go test ./cmd/feed-reader -run TestOpenAPI
```

Expected: PASS before refactor.

- [ ] **Step 2: Replace Connect calls with direct store/service calls**

In `openapi_handler.go`, remove all `connect.NewRequest(...)` calls and convert each operation to call store methods or existing non-Connect service helpers directly. Preserve response shapes and error status behavior already covered by OpenAPI tests.

- [ ] **Step 3: Run focused OpenAPI tests**

Run:

```bash
go test ./cmd/feed-reader -run TestOpenAPI
```

Expected: PASS.

## Task 3: Delete Connect Service Surface

**Files:**
- Delete or heavily modify: `cmd/feed-reader/handler.go`
- Delete or heavily modify: `cmd/feed-reader/item_handler.go`
- Delete or heavily modify: `cmd/feed-reader/tag_service.go`
- Modify/Delete: Connect-specific tests under `cmd/feed-reader`
- Test: `go test ./cmd/feed-reader`

- [ ] **Step 1: Search remaining Connect imports**

Run:

```bash
rg -n "connectrpc|connect\\.New|feedv1|itemv1|tagv1|feedv1connect|itemv1connect|tagv1connect" cmd/feed-reader
```

Expected: shows remaining Connect service implementation and tests.

- [ ] **Step 2: Remove or convert tests**

Delete tests that only assert Connect routing/client behavior. Convert behavior tests that still matter to `/api/v2` HTTP tests.

- [ ] **Step 3: Delete unused Connect service code**

Remove `handler.go`, `item_handler.go`, and `tag_service.go` once their logic has been migrated or replaced.

- [ ] **Step 4: Run backend tests**

Run:

```bash
go test ./cmd/feed-reader
```

Expected: PASS.

## Task 4: Remove Protobuf Generation and Dependencies

**Files:**
- Modify: `buf.gen.yaml`
- Modify: `Makefile`
- Modify: `go.mod`
- Modify: `go.sum`
- Delete: `proto/**`
- Delete: `gen/go/**`
- Test: `go test ./...`

- [ ] **Step 1: Search generated code references**

Run:

```bash
rg -n "gen/go|proto/|protoc-gen-go|protoc-gen-connect-go|google.golang.org/protobuf|connectrpc.com" .
```

Expected: only generation/dependency files remain.

- [ ] **Step 2: Remove generation configuration**

Remove protobuf generation from `buf.gen.yaml` and remove `gen-buf` from `Makefile` `gen`.

- [ ] **Step 3: Delete generated protobuf sources**

Delete `proto/**` and `gen/go/**`.

- [ ] **Step 4: Tidy Go modules**

Run:

```bash
go mod tidy
```

Expected: `connectrpc.com/connect`, `connectrpc.com/otelconnect`, and protobuf-only dependencies disappear if unused.

- [ ] **Step 5: Run full backend tests**

Run:

```bash
go test ./...
```

Expected: PASS.

## Task 5: Final Verification

**Files:**
- All changed files
- Test: dependency search and selected frontend checks if API contract changed

- [ ] **Step 1: Run dependency search**

Run:

```bash
rg -n "connectrpc|@connectrpc|@bufbuild|gen/go|feed\\.v1|item\\.v1|tag\\.v1|protoc-gen-connect-go|protoc-gen-go|google.golang.org/protobuf" .
```

Expected: no runtime or generation references remain.

- [ ] **Step 2: Run project checks**

Run:

```bash
npm run check
npm exec tsc -- --noEmit
npm run lint
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 npm run test
go test ./...
```

Expected: all pass.

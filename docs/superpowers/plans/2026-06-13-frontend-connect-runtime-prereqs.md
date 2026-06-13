# Frontend Connect Runtime Prerequisites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the missing JSON API coverage required before removing the frontend Connect/protobuf runtime.

**Architecture:** Extend the existing TypeSpec contract with the remaining frontend runtime operations, regenerate OpenAPI/Go/TypeScript artifacts, and keep backend handlers delegating to the existing Connect server methods for parity. Then migrate `feed-db.ts` and `tag-db.ts` to the JSON client, leaving test-only Connect helpers for a separate cleanup pass.

**Tech Stack:** TypeSpec, `oapi-codegen`, `openapi-typescript`, Go `net/http`, Solid/TanStack Query, Vitest.

---

## File Structure

- Modify `api/main.tsp`: add tags write APIs, feed-tag APIs, feed suspend/export APIs, and item-read sync API.
- Modify generated files: `api/openapi.yaml`, `gen/openapi/server.gen.go`, `frontend/src/lib/api/types.ts`.
- Modify `cmd/feed-reader/openapi_handler.go`: add OpenAPI adapter methods for the new operations.
- Modify `cmd/feed-reader/openapi_handler_test.go`: add OpenAPI endpoint tests for representative missing operations.
- Modify `cmd/feed-reader/api_parity_test.go`: add parity coverage comparing Connect and OpenAPI behavior.
- Modify `frontend/src/lib/feed-db.ts`: replace `feedClient` reads/writes still used at runtime with `apiClient`.
- Modify `frontend/src/lib/tag-db.ts`: replace `tagClient` writes with `apiClient`.
- Modify `frontend/src/lib/api/client.ts`: remove `itemClient`, leaving only `apiClient`.
- Modify `frontend/src/lib/api/parity.node.test.ts`: replace protobuf type imports with local Connect-shaped test fixtures or generated OpenAPI types where possible.

---

### Task 1: Add Remaining Runtime APIs to TypeSpec

**Files:**
- Modify: `api/main.tsp`
- Generated: `api/openapi.yaml`
- Generated: `gen/openapi/server.gen.go`
- Generated: `frontend/src/lib/api/types.ts`

- [ ] **Step 1: Write failing backend tests for missing generated methods**

Add tests to `cmd/feed-reader/openapi_handler_test.go` that reference these OpenAPI types:

```go
func TestOpenAPICreateAndDeleteTag(t *testing.T) { ... }
func TestOpenAPIListAndManageFeedTags(t *testing.T) { ... }
func TestOpenAPIExportOpmlReturnsBytes(t *testing.T) { ... }
func TestOpenAPIListItemRead(t *testing.T) { ... }
```

Run:

```bash
go test ./cmd/feed-reader -run 'TestOpenAPI(CreateAndDeleteTag|ListAndManageFeedTags|ExportOpmlReturnsBytes|ListItemRead)'
```

Expected: FAIL because the generated OpenAPI types and strict methods do not exist yet.

- [ ] **Step 2: Extend `api/main.tsp`**

Add models:

```typespec
model CreateTagRequest {
  name: string;
}

model CreateTagResponse {
  tag: Tag;
}

model FeedTag {
  feedId: string;
  tagId: string;
}

model ListFeedTagsResponse {
  feedTags: FeedTag[];
}

model ManageFeedTagsRequest {
  feedIds: string[];
  addTagIds: string[];
  removeTagIds: string[];
}

model SuspendFeedsRequest {
  ids: string[];
  suspendSeconds: Int64String;
}

model ExportOpmlRequest {
  ids: string[];
}

model ExportOpmlResponse {
  opmlContent: bytes;
}

model ItemRead {
  itemId: string;
  isRead: boolean;
  updatedAt: DateTime;
}

model ListItemReadResponse {
  itemReads: ItemRead[];
  nextPageToken: string;
}
```

Add operations:

```typespec
@route("/tags")
namespace Tags {
  @get
  op list(): ListTagsResponse | ErrorResponse;

  @post
  op create(@body body: CreateTagRequest): CreateTagResponse | ErrorResponse;

  @delete
  @route("/{id}")
  op delete(@path id: string): EmptyResponse | ErrorResponse;
}

@route("/feed-tags")
namespace FeedTags {
  @get
  op list(@query feedId?: string, @query tagId?: string): ListFeedTagsResponse | ErrorResponse;

  @post
  @route("/manage")
  op manage(@body body: ManageFeedTagsRequest): EmptyResponse | ErrorResponse;
}

@route("/feeds")
namespace Feeds {
  @post
  @route("/suspend")
  op suspend(@body body: SuspendFeedsRequest): EmptyResponse | ErrorResponse;

  @post
  @route("/export-opml")
  op exportOpml(@body body: ExportOpmlRequest): ExportOpmlResponse | ErrorResponse;
}

@route("/item-reads")
namespace ItemReads {
  @get
  op list(
    @query since?: DateTime,
    @query pageSize?: int32,
    @query pageToken?: string,
  ): ListItemReadResponse | ErrorResponse;
}
```

- [ ] **Step 3: Regenerate and inspect**

Run:

```bash
make gen-api
rg "anyOf|oneOf" api/openapi.yaml
```

Expected: generation succeeds, and `rg` prints no output.

---

### Task 2: Implement Backend OpenAPI Adapters and Parity

**Files:**
- Modify: `cmd/feed-reader/openapi_handler.go`
- Modify: `cmd/feed-reader/openapi_handler_test.go`
- Modify: `cmd/feed-reader/api_parity_test.go`

- [ ] **Step 1: Implement handler methods**

Add methods on `OpenAPIHandler` using existing Connect handlers:

```go
func (h *OpenAPIHandler) TagsCreate(ctx context.Context, request openapi.TagsCreateRequestObject) (openapi.TagsCreateResponseObject, error) { ... }
func (h *OpenAPIHandler) TagsDelete(ctx context.Context, request openapi.TagsDeleteRequestObject) (openapi.TagsDeleteResponseObject, error) { ... }
func (h *OpenAPIHandler) FeedTagsList(ctx context.Context, request openapi.FeedTagsListRequestObject) (openapi.FeedTagsListResponseObject, error) { ... }
func (h *OpenAPIHandler) FeedTagsManage(ctx context.Context, request openapi.FeedTagsManageRequestObject) (openapi.FeedTagsManageResponseObject, error) { ... }
func (h *OpenAPIHandler) FeedsSuspend(ctx context.Context, request openapi.FeedsSuspendRequestObject) (openapi.FeedsSuspendResponseObject, error) { ... }
func (h *OpenAPIHandler) FeedsExportOpml(ctx context.Context, request openapi.FeedsExportOpmlRequestObject) (openapi.FeedsExportOpmlResponseObject, error) { ... }
func (h *OpenAPIHandler) ItemReadsList(ctx context.Context, request openapi.ItemReadsListRequestObject) (openapi.ItemReadsListResponseObject, error) { ... }
```

For `SuspendFeedsRequest.suspendSeconds`, convert the JSON string with `strconv.ParseInt`.

- [ ] **Step 2: Run OpenAPI tests**

Run:

```bash
go test ./cmd/feed-reader -run 'TestOpenAPI(CreateAndDeleteTag|ListAndManageFeedTags|ExportOpmlReturnsBytes|ListItemRead)'
```

Expected: PASS.

- [ ] **Step 3: Add parity tests**

Add parity tests to `cmd/feed-reader/api_parity_test.go`:

```go
func TestAPIParityCreateDeleteTag(t *testing.T) { ... }
func TestAPIParityManageFeedTags(t *testing.T) { ... }
func TestAPIParityExportOpml(t *testing.T) { ... }
func TestAPIParityListItemRead(t *testing.T) { ... }
```

For OPML, compare base64-normalized bytes. For item-read, compare item ID, boolean read state, timestamp normalization, and page token.

- [ ] **Step 4: Run parity tests**

Run:

```bash
go test ./cmd/feed-reader -run 'TestAPIParity(CreateDeleteTag|ManageFeedTags|ExportOpml|ListItemRead)'
```

Expected: PASS.

---

### Task 3: Migrate Remaining Runtime Frontend Calls

**Files:**
- Modify: `frontend/src/lib/feed-db.ts`
- Modify: `frontend/src/lib/tag-db.ts`
- Modify: `frontend/src/lib/api/client.ts`
- Modify: `frontend/src/lib/api/parity.node.test.ts`

- [ ] **Step 1: Write or update frontend parity tests**

Update `frontend/src/lib/api/parity.node.test.ts` so mapper tests no longer import protobuf generated types. Use plain Connect-shaped fixtures:

```ts
const connectTag = {
  id: "tag-1",
  name: "Tech",
  createdAt: dateToTimestamp(new Date(timestamp)),
  updatedAt: dateToTimestamp(new Date(timestamp)),
  unreadCount: 5n,
  feedCount: 2n,
};
```

Run:

```bash
npm run test -- src/lib/api/parity.node.test.ts
```

Expected: FAIL until mapper input types accept local structural fixtures instead of generated protobuf types.

- [ ] **Step 2: Remove runtime Connect clients from `feed-db.ts`**

Replace:

```ts
await feedClient.manageFeedTags(params);
await feedClient.suspendFeeds({ ids: feedIds, suspendSeconds: BigInt(suspendSeconds) });
const res = await feedClient.exportOpml({ ids: feedIds });
const response = await feedClient.listFeedTags({});
```

with:

```ts
await apiClient.post<EmptyResponse>("/feed-tags/manage", params);
await apiClient.post<EmptyResponse>("/feeds/suspend", {
  ids: feedIds,
  suspendSeconds: String(suspendSeconds),
});
const res = await apiClient.post<ExportOpmlResponse>("/feeds/export-opml", { ids: feedIds });
const response = await apiClient.get<ListFeedTagsResponse>("/feed-tags");
```

Decode exported OPML with `base64ToBytes(res.opmlContent)`.

- [ ] **Step 3: Remove runtime Connect clients from `tag-db.ts`**

Replace:

```ts
await tagClient.createTag({ name: m.modified.name });
await tagClient.deleteTag({ id: m.modified.id });
```

with:

```ts
await apiClient.post<CreateTagResponse>("/tags", { name: m.modified.name });
await apiClient.delete<EmptyResponse>(`/tags/${m.modified.id}`);
```

- [ ] **Step 4: Remove `itemClient` from `frontend/src/lib/api/client.ts`**

Leave:

```ts
import { createApiClient } from "./json-client";

export const apiClient = createApiClient({ baseUrl: "/api/v2" });
```

- [ ] **Step 5: Run focused frontend tests**

Run:

```bash
npm run test -- src/lib/api/parity.node.test.ts src/lib/api/base64.node.test.ts
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 npm run test -- src/components/FeedList.test.tsx src/components/TagManagement.test.tsx src/components/ManageTagsModal.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Confirm no runtime Connect imports remain**

Run:

```bash
rg '@connectrpc|@bufbuild/protobuf|../gen|../../gen|createClient|createConnectTransport' frontend/src/lib frontend/src/main.tsx
```

Expected: remaining matches are only test files or removed by this task. `frontend/src/lib/query.ts`, `frontend/src/lib/api/client.ts`, `frontend/src/lib/feed-db.ts`, and `frontend/src/lib/tag-db.ts` should have no Connect/protobuf imports.

- [ ] **Step 7: Commit**

Run:

```bash
git add api/main.tsp api/openapi.yaml gen/openapi/server.gen.go frontend/src/lib/api/types.ts cmd/feed-reader/openapi_handler.go cmd/feed-reader/openapi_handler_test.go cmd/feed-reader/api_parity_test.go frontend/src/lib/feed-db.ts frontend/src/lib/tag-db.ts frontend/src/lib/api/client.ts frontend/src/lib/api/parity.node.test.ts
git commit -m "feat(api): migrate remaining frontend runtime APIs"
```

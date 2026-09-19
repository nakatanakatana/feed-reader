import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { ItemDetailModal } from "../components/ItemDetailModal";
import { TagManagement } from "../components/TagManagement";
import { queryClient } from "../lib/query";
import { ToastProvider } from "../lib/toast";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";
import {
  create,
  GetItemResponseSchema,
  ItemSchema,
  ListFeedTagsResponseSchema,
  ListItemsResponseSchema,
  ListTagsResponseSchema,
  ListURLParsingRulesResponseSchema,
  toJson,
  URLParsingRuleSchema,
} from "../test-utils/json-identity";
import {
  buildFeed,
  buildListFeedsResponse,
  buildListTagsResponse,
  buildTag,
} from "../test-utils/openapi-fixtures";
import { isReadOnly } from "../lib/readonly";

vi.unmock("@tanstack/solid-router");

vi.mock("../lib/readonly", () => ({
  isReadOnly: vi.fn(() => false),
}));

const isReadOnlyMock = vi.mocked(isReadOnly);

describe("readonly UI", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const renderRoute = (path: string) => {
    const history = createMemoryHistory({ initialEntries: [path] });
    const router = createRouter({ routeTree, history });
    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </QueryClientProvider>
      ),
      document.body,
    );
  };

  describe("when VITE_READONLY=true", () => {
    beforeEach(() => {
      isReadOnlyMock.mockReturnValue(true);
    });

    it("hides feed mutation controls on /feeds", async () => {
      await page.viewport?.(1280, 720);
      expect(isReadOnly()).toBe(true);
      worker.use(
        http.get("*/api/v2/feeds", () =>
          HttpResponse.json(
            buildListFeedsResponse([
              buildFeed({ id: "1", title: "Example Feed 1" }),
            ]),
          ),
        ),
        http.get("*/api/v2/tags", () =>
          HttpResponse.json(buildListTagsResponse([])),
        ),
        http.get("*/api/v2/feed-tags", () =>
          HttpResponse.json({ feedTags: [] }),
        ),
      );

      renderRoute("/feeds");

      await expect
        .element(page.getByText("Example Feed 1"))
        .toBeInTheDocument();

      await expect
        .element(page.getByRole("button", { name: "Add Feed" }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Import OPML" }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Fetch" }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Delete" }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByLabelText("Suspend fetching"))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Manage Tags" }))
        .not.toBeInTheDocument();
    });

    it("hides tag add/delete controls on /tags", async () => {
      worker.use(
        http.get("*/api/v2/tags", () =>
          HttpResponse.json(
            buildListTagsResponse([
              buildTag({ id: "tag-1", name: "Tech", feedCount: "1" }),
            ]),
          ),
        ),
        http.get("*/api/v2/feed-tags", () =>
          HttpResponse.json({ feedTags: [] }),
        ),
      );

      renderRoute("/tags");

      await expect.element(page.getByText("Tech")).toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Add Tag" }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Delete Tech" }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByPlaceholder("New tag name"))
        .not.toBeInTheDocument();
    });

    it("hides URL rule add/delete controls", async () => {
      worker.use(
        http.get("*/api/v2/url-rules", () =>
          HttpResponse.json({
            rules: [
              {
                id: "1",
                domain: "example.com",
                ruleType: "subdomain",
                pattern: "test",
              },
            ],
          }),
        ),
      );

      renderRoute("/url-rules");

      await expect.element(page.getByText("example.com")).toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Add" }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Delete" }))
        .not.toBeInTheDocument();
    });

    it("hides block rule add/delete controls", async () => {
      await page.viewport?.(1280, 720);
      worker.use(
        http.get("*/api/v2/block-rules", () =>
          HttpResponse.json({
            rules: [
              {
                id: "1",
                ruleType: "domain",
                value: "blocked-domain.com",
              },
            ],
          }),
        ),
      );

      renderRoute("/block-rules");

      await expect
        .element(page.getByText("blocked-domain.com").first())
        .toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Add" }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Bulk Add" }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Delete" }))
        .not.toBeInTheDocument();
    });

    it("hides item read-state bulk actions", async () => {
      await page.viewport?.(1280, 720);
      worker.use(
        http.all("*/api/v2/items", () => {
          const msg = create(ListItemsResponseSchema, {
            items: [
              create(ItemSchema, {
                id: "1",
                title: "Item 1",
                isRead: false,
              }),
            ],
          });
          return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
        }),
        http.all("*/api/v2/tags", () =>
          HttpResponse.json(
            toJson(
              ListTagsResponseSchema,
              create(ListTagsResponseSchema, { tags: [] }),
            ),
          ),
        ),
        http.all("*/api/v2/feed-tags", () =>
          HttpResponse.json(
            toJson(
              ListFeedTagsResponseSchema,
              create(ListFeedTagsResponseSchema, { feedTags: [] }),
            ),
          ),
        ),
      );

      renderRoute("/");

      await expect.element(page.getByText("Item 1")).toBeInTheDocument();
      await expect
        .element(page.getByLabelText("Select All"))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Mark as Read" }))
        .not.toBeInTheDocument();
    });

    it("hides item detail mutation controls", async () => {
      worker.use(
        http.all("*/api/v2/items/:id", () => {
          const msg = create(GetItemResponseSchema, {
            item: create(ItemSchema, {
              id: "item-1",
              title: "Detail Item",
              url: "https://example.com/article",
              isRead: false,
            }),
          });
          return HttpResponse.json(toJson(GetItemResponseSchema, msg));
        }),
        http.all("*/api/v2/url-rules", () => {
          const msg = create(ListURLParsingRulesResponseSchema, {
            rules: [
              create(URLParsingRuleSchema, {
                id: "rule1",
                domain: "example.com",
                ruleType: "subdomain",
                pattern: "example.com",
              }),
            ],
          });
          return HttpResponse.json(
            toJson(ListURLParsingRulesResponseSchema, msg),
          );
        }),
      );

      dispose = render(
        () => (
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <ItemDetailModal
                itemId="item-1"
                onClose={() => undefined}
                nextItemId={undefined}
                prevItemId={undefined}
              />
            </ToastProvider>
          </QueryClientProvider>
        ),
        document.body,
      );

      await expect.element(page.getByText("Detail Item")).toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Mark as Read" }))
        .not.toBeInTheDocument();
    });
  });

  describe("primary mode", () => {
    beforeEach(() => {
      isReadOnlyMock.mockReturnValue(false);
    });

    it("still renders Add Feed on /feeds", async () => {
      await page.viewport?.(1280, 720);
      expect(isReadOnly()).toBe(false);
      worker.use(
        http.get("*/api/v2/feeds", () =>
          HttpResponse.json(buildListFeedsResponse([])),
        ),
        http.get("*/api/v2/tags", () =>
          HttpResponse.json(buildListTagsResponse([])),
        ),
        http.get("*/api/v2/feed-tags", () =>
          HttpResponse.json({ feedTags: [] }),
        ),
      );

      renderRoute("/feeds");

      await expect
        .element(page.getByRole("button", { name: "Add Feed" }))
        .toBeInTheDocument();
    });

    it("still renders Add Tag on tags management", async () => {
      worker.use(
        http.get("*/api/v2/tags", () =>
          HttpResponse.json(buildListTagsResponse([])),
        ),
        http.get("*/api/v2/feed-tags", () =>
          HttpResponse.json({ feedTags: [] }),
        ),
      );

      dispose = render(
        () => (
          <QueryClientProvider client={queryClient}>
            <TagManagement />
          </QueryClientProvider>
        ),
        document.body,
      );

      await expect
        .element(page.getByRole("button", { name: "Add Tag" }))
        .toBeInTheDocument();
    });

    it("still renders Mark as Read on item detail modal", async () => {
      worker.use(
        http.all("*/api/v2/items/:id", () => {
          const msg = create(GetItemResponseSchema, {
            item: create(ItemSchema, {
              id: "item-1",
              title: "Detail Item",
              url: "https://example.com/article",
              isRead: false,
            }),
          });
          return HttpResponse.json(toJson(GetItemResponseSchema, msg));
        }),
        http.all("*/api/v2/url-rules", () => {
          const msg = create(ListURLParsingRulesResponseSchema, {
            rules: [
              create(URLParsingRuleSchema, {
                id: "rule1",
                domain: "example.com",
                ruleType: "subdomain",
                pattern: "example.com",
              }),
            ],
          });
          return HttpResponse.json(
            toJson(ListURLParsingRulesResponseSchema, msg),
          );
        }),
      );

      dispose = render(
        () => (
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <ItemDetailModal
                itemId="item-1"
                onClose={() => undefined}
                nextItemId={undefined}
                prevItemId={undefined}
              />
            </ToastProvider>
          </QueryClientProvider>
        ),
        document.body,
      );

      await expect.element(page.getByText("Detail Item")).toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Mark as Read" }))
        .toBeInTheDocument();
    });
  });
});

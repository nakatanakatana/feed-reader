import { create, toJson } from "@bufbuild/protobuf";
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
import {
  BlockingRuleSchema,
  ListURLParsingRulesResponseSchema,
  URLParsingRuleSchema,
} from "../gen/blocking/v1/blocking_pb";
import { ListFeedTagsResponseSchema } from "../gen/feed/v1/feed_pb";
import { ListItemsResponseSchema } from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("Parsing Rules Route", () => {
  let dispose: () => void;
  let mockRules: Record<string, unknown>[] = [];

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    queryClient.clear();
  });

  beforeEach(() => {
    mockRules = [];
    worker.use(
      http.post("*/blocking.v1.BlockingService/ListURLParsingRules", () => {
        const msg = create(ListURLParsingRulesResponseSchema, {
          rules: mockRules.map((r) => create(URLParsingRuleSchema, r)),
        });
        return HttpResponse.json(
          toJson(ListURLParsingRulesResponseSchema, msg),
        );
      }),
      http.post(
        "*/blocking.v1.BlockingService/CreateURLParsingRule",
        async ({ request }) => {
          const body = (await request.json()) as {
            domain: string;
            pattern: string;
          };
          const now = new Date().toISOString();
          const newRule = {
            id: `new-rule-${Math.random()}`,
            domain: body.domain,
            pattern: body.pattern,
            createdAt: now,
            updatedAt: now,
          };
          mockRules.push(newRule);
          return HttpResponse.json(
            toJson(URLParsingRuleSchema, create(URLParsingRuleSchema, newRule)),
          );
        },
      ),
      http.post(
        "*/blocking.v1.BlockingService/DeleteURLParsingRule",
        async ({ request }) => {
          const body = (await request.json()) as { id: string };
          mockRules = mockRules.filter((r) => r.id !== body.id);
          return HttpResponse.json({});
        },
      ),
      // Other mocks
      http.post("*/blocking.v1.BlockingService/ListBlockingRules", () => {
        return HttpResponse.json({ rules: [] });
      }),
      http.post("*/item.v1.ItemService/ListItems", () => {
        return HttpResponse.json(
          toJson(
            ListItemsResponseSchema,
            create(ListItemsResponseSchema, { items: [], totalCount: 0 }),
          ),
        );
      }),
      http.post("*/tag.v1.TagService/ListTags", () => {
        return HttpResponse.json(
          toJson(
            ListTagsResponseSchema,
            create(ListTagsResponseSchema, { tags: [] }),
          ),
        );
      }),
      http.post("*/feed.v1.FeedService/ListFeedTags", () => {
        return HttpResponse.json(
          toJson(
            ListFeedTagsResponseSchema,
            create(ListFeedTagsResponseSchema, { feedTags: [] }),
          ),
        );
      }),
    );
  });

  it("renders the Domain URL Parsing Rules cards", async () => {
    mockRules = [
      { id: "1", domain: "example.com", pattern: "pattern1" },
      { id: "2", domain: "test.com", pattern: "pattern2" },
    ];

    const history = createMemoryHistory({
      initialEntries: ["/parsing-rules"],
    });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    await expect
      .element(page.getByText("example.com", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("test.com", { exact: true }))
      .toBeInTheDocument();
  });

  it("adds a new URL parsing rule via the form", async () => {
    const history = createMemoryHistory({
      initialEntries: ["/parsing-rules"],
    });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    const domainInput = page.getByLabelText("Domain");
    await domainInput.fill("new-domain.com");

    const patternInput = page.getByLabelText(/Regex Pattern/);
    await patternInput.fill("new-pattern");

    const addButton = page.getByRole("button", { name: "Add Rule" });
    await addButton.click();
    await page.waitForTimeout(500);

    await expect
      .poll(async () => {
        const el = page.getByText("new-domain.com", { exact: true });
        return await el.query();
      }, { timeout: 5000 })
      .not.toBeNull();
  });

  it("deletes an existing URL parsing rule", async () => {
    mockRules = [{ id: "del-1", domain: "delete-me.com", pattern: "p1" }];

    const history = createMemoryHistory({
      initialEntries: ["/parsing-rules"],
    });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    await expect
      .element(page.getByText("delete-me.com", { exact: true }))
      .toBeInTheDocument();

    const deleteButton = page.getByRole("button", { name: /Delete/ });
    await deleteButton.click();
    await page.waitForTimeout(500);

    await expect
      .poll(async () => {
        const el = page.getByText("delete-me.com", { exact: true });
        return await el.query();
      }, { timeout: 5000 })
      .toBeNull();
  });
});

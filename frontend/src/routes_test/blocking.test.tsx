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
  BulkCreateBlockingRulesResponseSchema,
  ListBlockingRulesResponseSchema,
} from "../gen/blocking/v1/blocking_pb";
import { ListFeedTagsResponseSchema } from "../gen/feed/v1/feed_pb";
import { ListItemsResponseSchema } from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("Blocking Route", () => {
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
      http.post("*/blocking.v1.BlockingService/ListBlockingRules", () => {
        const msg = create(ListBlockingRulesResponseSchema, {
          rules: mockRules.map((r) => create(BlockingRuleSchema, r)),
        });
        return HttpResponse.json(toJson(ListBlockingRulesResponseSchema, msg));
      }),
      http.post(
        "*/blocking.v1.BlockingService/CreateBlockingRule",
        async ({ request }) => {
          const body = (await request.json()) as {
            ruleType: string;
            username?: string;
            domain?: string;
            keyword?: string;
          };
          const now = new Date().toISOString();
          const newRule = {
            id: `new-block-${Math.random()}`,
            ruleType: body.ruleType,
            username: body.username,
            domain: body.domain,
            keyword: body.keyword,
            createdAt: now,
            updatedAt: now,
          };
          mockRules.push(newRule);
          return HttpResponse.json(
            toJson(BlockingRuleSchema, create(BlockingRuleSchema, newRule)),
          );
        },
      ),
      http.post(
        "*/blocking.v1.BlockingService/BulkCreateBlockingRules",
        async ({ request }) => {
          const body = (await request.json()) as {
            rules: {
              ruleType: string;
              username?: string;
              domain?: string;
              keyword?: string;
            }[];
          };
          const now = new Date().toISOString();
          const newRules = body.rules.map((r, i: number) => ({
            id: `bulk-${Math.random()}-${i}`,
            ...r,
            createdAt: now,
            updatedAt: now,
          }));
          mockRules.push(...newRules);
          const msg = create(BulkCreateBlockingRulesResponseSchema, {
            rules: newRules.map((r) => create(BlockingRuleSchema, r)),
          });
          return HttpResponse.json(
            toJson(BulkCreateBlockingRulesResponseSchema, msg),
          );
        },
      ),
      http.post(
        "*/blocking.v1.BlockingService/DeleteBlockingRule",
        async ({ request }) => {
          const body = (await request.json()) as { id: string };
          mockRules = mockRules.filter((r) => r.id !== body.id);
          return HttpResponse.json({});
        },
      ),
      http.post("*/blocking.v1.BlockingService/ReevaluateAllItems", () => {
        return HttpResponse.json({});
      }),
      // Other mocks
      http.post("*/blocking.v1.BlockingService/ListURLParsingRules", () => {
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

  it("renders the Blocking Rules table", async () => {
    mockRules = [
      { id: "1", ruleType: "keyword", keyword: "badword" },
      {
        id: "2",
        ruleType: "user_domain",
        domain: "spam.com",
        username: "spammer",
      },
    ];

    const history = createMemoryHistory({ initialEntries: ["/blocking"] });
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
      .element(page.getByText("badword", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("spam.com", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("spammer", { exact: true }))
      .toBeInTheDocument();
  });

  it("adds a new keyword blocking rule", async () => {
    const history = createMemoryHistory({ initialEntries: ["/blocking"] });
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

    const typeSelect = page.getByLabelText(/Rule Type/i);
    await typeSelect.selectOptions("keyword");

    const keywordInput = page.getByLabelText("Keyword");
    await keywordInput.fill("BLOCKED_TERM");

    const addButton = page.getByRole("button", { name: "Add Rule" });
    await addButton.click();

    await expect
      .poll(async () => {
        const el = page.getByText("BLOCKED_TERM", { exact: true });
        return await el.query();
      })
      .not.toBeNull();
  });

  it("performs bulk import of rules", async () => {
    const history = createMemoryHistory({ initialEntries: ["/blocking"] });
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

    const textarea = page.getByLabelText("Paste rules here");
    await textarea.fill(`keyword,,,bulk1
user_domain,,bulk-spam.com,`);

    const importButton = page.getByRole("button", { name: /Import Rules/ });
    await importButton.click();

    await expect
      .poll(async () => {
        const el = page.getByText("bulk1", { exact: true });
        return await el.query();
      })
      .not.toBeNull();

    await expect
      .poll(async () => {
        const el = page.getByText("bulk-spam.com", { exact: true });
        return await el.query();
      })
      .not.toBeNull();
  });
});

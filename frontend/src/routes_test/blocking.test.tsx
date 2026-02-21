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
  BlockingService,
  BulkCreateBlockingRulesResponseSchema,
  CreateBlockingRuleResponseSchema,
  ListBlockingRulesResponseSchema,
} from "../gen/blocking/v1/blocking_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { mockConnectWeb } from "../mocks/connect";
import { routeTree } from "../routeTree.gen";

describe("Blocking Route", () => {
  let dispose: () => void;
  const mockRules: any[] = [];

  beforeEach(() => {
    mockRules.length = 0;
    queryClient.clear();
    worker.use(
      mockConnectWeb(BlockingService)({
        method: "listBlockingRules",
        handler: () => {
          return create(ListBlockingRulesResponseSchema, {
            rules: mockRules.map((r) => create(BlockingRuleSchema, r)),
          });
        },
      }),
      mockConnectWeb(BlockingService)({
        method: "createBlockingRule",
        handler: (req) => {
          const now = new Date().toISOString();
          const newRule = {
            id: `new-block-${Math.random()}`,
            ...req,
            createdAt: now,
            updatedAt: now,
          };
          mockRules.push(newRule);
          return create(CreateBlockingRuleResponseSchema, {
            rule: create(BlockingRuleSchema, newRule),
          });
        },
      }),
      mockConnectWeb(BlockingService)({
        method: "bulkCreateBlockingRules",
        handler: (req) => {
          const now = new Date().toISOString();
          const newRules = (req.rules || []).map((r) => ({
            id: `bulk-${Math.random()}`,
            ...r,
            createdAt: now,
            updatedAt: now,
          }));
          mockRules.push(...newRules);
          return create(BulkCreateBlockingRulesResponseSchema, {
            rules: newRules.map((r) => create(BlockingRuleSchema, r)),
          });
        },
      }),
      mockConnectWeb(BlockingService)({
        method: "deleteBlockingRule",
        handler: (req) => {
          const index = mockRules.findIndex((r) => r.id === req.id);
          if (index !== -1) {
            mockRules.splice(index, 1);
          }
          return {};
        },
      }),
    );
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const renderRoute = () => {
    const history = createMemoryHistory({ initialEntries: ["/blocking"] });
    const router = createRouter({ routeTree, history });

    return render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );
  };

  it("renders the Blocking Rules heading", async () => {
    mockRules.push(
      { id: "1", ruleType: "keyword", keyword: "badword" },
      {
        id: "2",
        ruleType: "user_domain",
        domain: "spam.com",
        username: "spammer",
      },
    );

    dispose = renderRoute();

    await expect.element(page.getByRole("heading", { name: /Existing Blocking Rules/i })).toBeVisible();
    await expect.element(page.getByText("badword", { exact: true })).toBeVisible();
    await expect.element(page.getByText("spam.com", { exact: true })).toBeVisible();
    await expect.element(page.getByText("spammer", { exact: true })).toBeVisible();
  });

  it("adds a new keyword blocking rule", async () => {
    dispose = renderRoute();

    await expect.element(page.getByRole("heading", { name: /Existing Blocking Rules/i })).toBeVisible();

    const typeSelect = page.getByLabelText("Rule Type");
    await typeSelect.selectOptions("keyword");

    const keywordInput = page.getByLabelText("Keyword");
    await keywordInput.fill("BLOCKED_TERM");

    const addButton = page.getByRole("button", { name: "Add Rule" });
    await addButton.click();

    await expect
      .poll(async () => {
        const el = page.getByText("BLOCKED_TERM", { exact: true });
        return await el.query();
      }, { timeout: 10000 })
      .not.toBeNull();
  });

  it("performs bulk import of rules", async () => {
    dispose = renderRoute();

    await expect.element(page.getByRole("heading", { name: /Bulk Import Blocking Rules/i })).toBeVisible();

    const textarea = page.getByLabelText("Paste rules here");
    await textarea.fill(`keyword,,,bulk1
user_domain,,bulk-spam.com,`);

    const importButton = page.getByRole("button", { name: /Import Rules/ });
    await importButton.click();

    await expect
      .poll(async () => {
        const el = page.getByText("bulk1", { exact: true });
        return await el.query();
      }, { timeout: 10000 })
      .not.toBeNull();

    await expect
      .poll(async () => {
        const el = page.getByText("bulk-spam.com", { exact: true });
        return await el.query();
      }, { timeout: 10000 })
      .not.toBeNull();
  });
});

import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { routeTree } from "../routeTree.gen";
import { create, toJson } from "../test-utils/json-identity";
import "../styles.css";
import { HttpResponse, http } from "msw";
import { queryClient } from "../lib/query";
import { worker } from "../mocks/browser";
import {
  ItemBlockRuleSchema,
  ListItemBlockRulesResponseSchema,
} from "../test-utils/json-identity";

describe("Block Rules Final Integration", () => {
  let dispose: () => void;

  beforeEach(() => {
    queryClient.clear();
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("does not trigger backend requests when filtering or sorting", async () => {
    let requestCount = 0;
    const rules = [
      create(ItemBlockRuleSchema, {
        id: "1",
        ruleType: "user",
        value: "alice",
      }),
      create(ItemBlockRuleSchema, {
        id: "2",
        ruleType: "domain",
        value: "example.com",
      }),
    ];

    worker.use(
      http.all("*/api/v2/block-rules", () => {
        requestCount++;
        const msg = create(ListItemBlockRulesResponseSchema, { rules });
        return HttpResponse.json(toJson(ListItemBlockRulesResponseSchema, msg));
      }),
      // Mock other required requests to avoid noise
      http.all("*/api/v2/items", () => HttpResponse.json({})),
      http.all("*/api/v2/tags", () => HttpResponse.json({})),
      http.all("*/api/v2/feed-tags", () => HttpResponse.json({})),
    );

    const history = createMemoryHistory({ initialEntries: ["/block-rules"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      ),
      document.body,
    );

    // Wait for initial load
    await expect.element(page.getByText("alice").first()).toBeInTheDocument();
    const initialCount = requestCount;
    expect(initialCount).toBeGreaterThan(0);

    // 1. Change filter
    const typeSelect = page.getByLabelText("Filter:");
    await typeSelect.selectOptions("domain");
    await expect
      .element(page.getByText("alice").first())
      .not.toBeInTheDocument();

    // 2. Change sort
    const valueHeader = page.getByRole("button", { name: /Value/ }).first();
    await valueHeader.click();

    // Verify request count hasn't increased
    expect(requestCount).toBe(initialCount);
  });
});

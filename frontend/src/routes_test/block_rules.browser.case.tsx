import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { routeTree } from "../routeTree.gen";
import "../styles.css";
import { QueryClientProvider } from "@tanstack/solid-query";
import type { ItemBlockRule } from "../lib/block-db";
import { queryClient } from "../lib/query";
import { worker } from "../mocks/browser";

// Unmock solid-router to test active link logic
vi.unmock("@tanstack/solid-router");

describe("Block Rules Page", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should fetch and display item block rules", async () => {
    const rules = [
      {
        id: "1",
        ruleType: "domain",
        value: "blocked-domain.com",
      },
      {
        id: "2",
        ruleType: "keyword",
        value: "spam-keyword",
      },
    ];

    worker.use(
      http.get("*/api/v2/block-rules", () => HttpResponse.json({ rules })),
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

    await expect
      .element(page.getByText("blocked-domain.com").first())
      .toBeInTheDocument();
    await expect
      .element(page.getByText("spam-keyword").first())
      .toBeInTheDocument();

    // Snapshot testing with document.body.innerHTML as per project convention
    // Mask random IDs generated during render
    const html = document.body.innerHTML.replace(
      /id="[0-9.]+"/g,
      'id="MASKED_ID"',
    );
    expect(html).toMatchSnapshot();
  });

  it("should allow adding a new item block rule", async () => {
    const rules: ItemBlockRule[] = [];

    worker.use(
      http.get("*/api/v2/block-rules", () => HttpResponse.json({ rules })),
      http.post("*/api/v2/block-rules", async ({ request }) => {
        const req = (await request.json()) as { rules: ItemBlockRule[] };
        for (const r of req.rules) {
          const newRule = {
            id: Math.random().toString(),
            ruleType: r.ruleType,
            value: r.value,
            domain: r.domain,
          };
          rules.push(newRule);
        }
        return HttpResponse.json({});
      }),
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

    const typeSelect = page.getByLabelText("Type", { exact: true });
    const valueInput = page.getByLabelText("Value");
    const addButton = page.getByRole("button", { name: "Add", exact: true });

    await typeSelect.selectOptions("keyword");
    await valueInput.fill("new-block-keyword");
    await addButton.click();

    await expect
      .element(page.getByText("new-block-keyword").first())
      .toBeInTheDocument();
  });

  it("should allow adding a new item block rule with domain (user_domain)", async () => {
    const rules: ItemBlockRule[] = [];

    worker.use(
      http.get("*/api/v2/block-rules", () => HttpResponse.json({ rules })),
      http.post("*/api/v2/block-rules", async ({ request }) => {
        const req = (await request.json()) as { rules: ItemBlockRule[] };
        for (const r of req.rules) {
          const newRule = {
            id: Math.random().toString(),
            ruleType: r.ruleType,
            value: r.value,
            domain: r.domain,
          };
          rules.push(newRule);
        }
        return HttpResponse.json({});
      }),
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

    const typeSelect = page.getByLabelText("Type", { exact: true });
    const valueInput = page.getByLabelText("Value");
    const domainInput = page.getByLabelText("Domain (Optional)");
    const addButton = page.getByRole("button", { name: "Add", exact: true });

    await typeSelect.selectOptions("user_domain");
    await valueInput.fill("blocked-user");
    await domainInput.fill("example.com");
    await addButton.click();

    await expect
      .element(page.getByText("blocked-user").first())
      .toBeInTheDocument();
    await expect
      .element(page.getByText("@example.com").first())
      .toBeInTheDocument();
  });

  it("should allow deleting an item block rule", async () => {
    let rules = [
      {
        id: "1",
        ruleType: "domain",
        value: "to-delete.com",
      },
    ];

    worker.use(
      http.get("*/api/v2/block-rules", () => HttpResponse.json({ rules })),
      http.delete("*/api/v2/block-rules/:id", ({ params }) => {
        rules = rules.filter((r) => r.id !== params.id);
        return HttpResponse.json({});
      }),
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

    await expect
      .element(page.getByText("to-delete.com").first())
      .toBeInTheDocument();

    const deleteButton = page.getByRole("button", { name: "Delete" }).first();
    await deleteButton.click();

    await expect
      .element(page.getByText("to-delete.com").first())
      .not.toBeInTheDocument();
  });
});

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
import type { URLParsingRule } from "../lib/block-db";
import { queryClient } from "../lib/query";
import { worker } from "../mocks/browser";

// Unmock solid-router to test active link logic
vi.unmock("@tanstack/solid-router");

describe("URL Rules Page", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should fetch and display URL parsing rules", async () => {
    const rules = [
      {
        id: "1",
        domain: "example.com",
        ruleType: "subdomain",
        pattern: "test",
      },
      {
        id: "2",
        domain: "test.com",
        ruleType: "path",
        pattern: "/abc",
      },
    ];

    worker.use(
      http.get("*/api/v2/url-rules", () => HttpResponse.json({ rules })),
    );

    const history = createMemoryHistory({ initialEntries: ["/url-rules"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      ),
      document.body,
    );

    await expect.element(page.getByText("example.com")).toBeInTheDocument();
    await expect.element(page.getByText("test.com")).toBeInTheDocument();
  });

  it("should allow adding a new URL parsing rule", async () => {
    const rules: URLParsingRule[] = [];

    worker.use(
      http.get("*/api/v2/url-rules", () => HttpResponse.json({ rules })),
      http.post("*/api/v2/url-rules", async ({ request }) => {
        const req = (await request.json()) as Omit<URLParsingRule, "id">;
        const newRule = {
          id: "3",
          domain: req.domain,
          ruleType: req.ruleType,
          pattern: req.pattern,
        };
        rules.push(newRule);
        return HttpResponse.json({ rule: newRule });
      }),
    );

    const history = createMemoryHistory({ initialEntries: ["/url-rules"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      ),
      document.body,
    );

    const domainInput = page.getByLabelText("Domain");
    const typeSelect = page.getByLabelText("Type");
    const patternInput = page.getByLabelText("Pattern");
    const addButton = page.getByRole("button", { name: "Add" });

    await domainInput.fill("new-domain.com");
    await typeSelect.selectOptions("path");
    await patternInput.fill("new-pattern");
    await addButton.click();

    await expect.element(page.getByText("new-domain.com")).toBeInTheDocument();
    await expect
      .element(page.getByRole("listitem").getByText("path"))
      .toBeInTheDocument();
  });

  it("should allow deleting a URL parsing rule", async () => {
    let rules = [
      {
        id: "1",
        domain: "example.com",
        ruleType: "subdomain",
        pattern: "test",
      },
    ];

    worker.use(
      http.get("*/api/v2/url-rules", () => HttpResponse.json({ rules })),
      http.delete("*/api/v2/url-rules/:id", ({ params }) => {
        rules = rules.filter((r) => r.id !== params.id);
        return HttpResponse.json({});
      }),
    );

    const history = createMemoryHistory({ initialEntries: ["/url-rules"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      ),
      document.body,
    );

    await expect.element(page.getByText("example.com")).toBeInTheDocument();

    const deleteButton = page.getByRole("button", { name: "Delete" });
    await deleteButton.click();

    await expect.element(page.getByText("example.com")).not.toBeInTheDocument();
  });
});

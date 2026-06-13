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
import { queryClient } from "../lib/query";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("BlockRules page bulk add button", () => {
  let dispose: () => void;

  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  it("should have Bulk Add button", async () => {
    worker.use(
      http.get("*/api/v2/block-rules", () => HttpResponse.json({ rules: [] })),
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
      .element(page.getByRole("button", { name: "Bulk Add", exact: true }))
      .toBeInTheDocument();
  });

  it("should open modal when Bulk Add button is clicked", async () => {
    worker.use(
      http.get("*/api/v2/block-rules", () => HttpResponse.json({ rules: [] })),
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

    const bulkAddButton = page.getByRole("button", {
      name: "Bulk Add",
      exact: true,
    });
    await bulkAddButton.click();

    await expect
      .element(page.getByText("Bulk Add Block Rules"))
      .toBeInTheDocument();
  });

  it("should submit valid rules to the backend", async () => {
    const addItemBlockRulesSpy = vi.fn();

    worker.use(
      http.get("*/api/v2/block-rules", () => HttpResponse.json({ rules: [] })),
      http.post("*/api/v2/block-rules", async ({ request }) => {
        const body = await request.json();
        addItemBlockRulesSpy(body);
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

    // Open modal
    await page.getByRole("button", { name: "Bulk Add", exact: true }).click();

    // Fill CSV
    const textarea = page.getByPlaceholder(/user,john_doe/);
    await textarea.fill(`user,john_doe
domain,example.com`);

    // Click Register
    const registerButton = page.getByRole("button", {
      name: /Register \(2 rules\)/,
    });
    await registerButton.click();

    // Verify backend call
    await expect.poll(() => addItemBlockRulesSpy).toHaveBeenCalled();
    const callArgs = addItemBlockRulesSpy.mock.calls[0][0];
    expect(callArgs.rules).toHaveLength(2);
    expect(callArgs.rules[0]).toMatchObject({
      ruleType: "user",
      value: "john_doe",
    });
    expect(callArgs.rules[1]).toMatchObject({
      ruleType: "domain",
      value: "example.com",
    });

    // Verify success message and Done button
    await expect
      .element(page.getByText("Successfully registered rules!"))
      .toBeInTheDocument();
    const doneButton = page.getByRole("button", { name: "Done" });
    await doneButton.click();

    // Verify modal is closed
    await expect
      .element(page.getByText("Bulk Add Block Rules"))
      .not.toBeInTheDocument();
  });
});

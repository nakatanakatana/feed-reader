import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";

describe("FeedList Selection", () => {
  let dispose: () => void;

  afterEach(async () => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  const TestWrapper = (props: { children: JSX.Element }) => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </TransportProvider>
  );

  it("selects all visible feeds when 'Select All' is clicked", async () => {
    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TestWrapper>
          <RouterProvider router={router} />
        </TestWrapper>
      ),
      document.body,
    );

    // Wait for feeds to load
    await expect.element(page.getByText("Example Feed 1")).toBeInTheDocument();
    
    const selectAllCheckbox = page.getByRole("checkbox", { name: "Select all visible feeds" });
    await expect.element(selectAllCheckbox).toBeInTheDocument();

    await selectAllCheckbox.click();

    // All feeds should be selected
    const checkboxes = page.getByRole("checkbox");
    // 1 (select all) + 2 (feeds) = 3 checkboxes
    await expect.poll(async () => (await checkboxes.all()).length).toBe(3);
    
    for (const checkbox of await checkboxes.all()) {
        await expect.element(checkbox).toBeChecked();
    }

    await expect.element(page.getByText("2 feeds selected")).toBeInTheDocument();
  });

  it("shows indeterminate state when some feeds are selected", async () => {
    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TestWrapper>
          <RouterProvider router={router} />
        </TestWrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Example Feed 1")).toBeInTheDocument();
    
    const feedCheckboxes = page.getByRole("checkbox").all();
    // Wait for feed checkboxes to appear
    await expect.poll(async () => (await feedCheckboxes).length).toBeGreaterThan(1);
    
    // Select the first feed checkbox (index 1, as index 0 will be "Select All")
    const firstFeedCheckbox = (await feedCheckboxes)[1];
    await firstFeedCheckbox.click();

    const selectAllCheckbox = page.getByRole("checkbox", { name: "Select all visible feeds" });
    // In Solid/HTML, indeterminate is a property, not an attribute that can be easily checked via ARIA in some cases, 
    // but vitest-browser might handle it or we can check the property.
    const selectAllEl = await selectAllCheckbox.element();
    expect(selectAllEl.indeterminate).toBe(true);
  });

  it("deselects all visible feeds when 'Select All' is clicked and all are already selected", async () => {
    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TestWrapper>
          <RouterProvider router={router} />
        </TestWrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Example Feed 1")).toBeInTheDocument();
    
    const selectAllCheckbox = page.getByRole("checkbox", { name: "Select all visible feeds" });
    await selectAllCheckbox.click(); // Select all
    await expect.element(selectAllCheckbox).toBeChecked();

    await selectAllCheckbox.click(); // Deselect all

    await expect.element(selectAllCheckbox).not.toBeChecked();
    await expect.element(page.getByTestId("bulk-action-bar")).not.toBeInTheDocument();
  });

  it("shows BulkActionBar when at least one feed is selected", async () => {
    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TestWrapper>
          <RouterProvider router={router} />
        </TestWrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Example Feed 1")).toBeInTheDocument();
    
    const checkboxes = page.getByRole("checkbox");
    await expect.poll(async () => (await checkboxes.all()).length).toBeGreaterThan(1);
    
    await checkboxes.nth(1).click();

    // Bulk action bar should be visible
    const bulkActionBar = page.getByTestId("bulk-action-bar");
    await expect.element(bulkActionBar).toBeVisible();
    await expect.element(page.getByText("1 feeds selected")).toBeInTheDocument();
  });
});

import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { queryClient } from "../lib/query";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("FeedList", () => {
  let dispose: () => void;

  beforeEach(() => {
    localStorage.clear();
    vi.setSystemTime(new Date("2026-03-07T12:00:00Z"));
  });

  afterEach(async () => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    vi.useRealTimers();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  const TestWrapper = (props: { children: JSX.Element }) => (
    <QueryClientProvider client={queryClient}>
      {props.children}
    </QueryClientProvider>
  );

  it("displays a list of feeds", async () => {
    await page.viewport?.(1280, 720);
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
    await expect.element(page.getByText("Example Feed 2")).toBeInTheDocument();

    // Snapshot testing with masking for dynamic timestamps
    const html = document.body.innerHTML.replace(
      /Last fetched: [^<]+/g,
      "Last fetched: MASKED_TIMESTAMP",
    );
    expect(html).toMatchSnapshot();
  });

  it("deletes a feed", async () => {
    await page.viewport?.(1280, 720);
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

    const deleteButton = page.getByRole("button", { name: "Delete" }).first();
    await expect.element(deleteButton).toBeVisible();

    await userEvent.click(deleteButton);

    // Force re-fetch since invalidation might be slow in tests
    await queryClient.refetchQueries({ queryKey: ["feeds"] });

    // Wait for the feed to disappear
    await expect
      .poll(async () => {
        const elements = await page.getByText("Example Feed 1").all();
        return elements.length;
      })
      .toBe(0);
  });

  it("supports bulk selection", async () => {
    await page.viewport?.(1280, 720);
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

    const checkboxes = page.getByRole("checkbox");

    await expect.poll(async () => (await checkboxes.all()).length).toBe(3);

    await userEvent.click(checkboxes.nth(1));

    await userEvent.click(checkboxes.nth(2));

    // Bulk action bar should show selected count

    await expect
      .element(page.getByText("2 feeds selected"))
      .toBeInTheDocument();
  });

  it("manages tags for selected feeds", async () => {
    await page.viewport?.(1280, 720);
    vi.useRealTimers();
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

    const checkboxes = page.getByRole("checkbox");
    await expect.poll(async () => (await checkboxes.all()).length).toBe(3);

    // Select first feed (checkbox at index 1, index 0 is select all)
    await userEvent.click(checkboxes.nth(1));

    // Click Manage Tags button
    const manageButton = page.getByRole("button", {
      name: /Manage Tags/i,
    });
    await expect.element(manageButton).toBeInTheDocument();
    await userEvent.click(manageButton);

    // Should show modal

    await expect
      .element(page.getByText("Manage Tags for 1 feeds"))
      .toBeInTheDocument();
  });

  it("displays 'Soon' when nextFetch is in the past", async () => {
    // Override MSW handler to return a feed with a past nextFetchAt
    const pastDate = new Date("2026-03-07T11:55:00Z");
    const futureDate = new Date("2026-03-07T12:05:00Z");

    worker.use(
      http.get("*/api/v2/feeds", () => {
        return HttpResponse.json({
          feeds: [
            {
              id: "past-feed",
              url: "https://example.com/past.xml",
              title: "Past Feed",
              nextFetchAt: pastDate.toISOString(),
              createdAt: "2026-03-01T00:00:00.000Z",
              updatedAt: "2026-03-01T00:00:00.000Z",
              tags: [],
              unreadCount: "0",
            },
            {
              id: "future-feed",
              url: "https://example.com/future.xml",
              title: "Future Feed",
              nextFetchAt: futureDate.toISOString(),
              createdAt: "2026-03-01T00:00:00.000Z",
              updatedAt: "2026-03-01T00:00:00.000Z",
              tags: [],
              unreadCount: "0",
            },
          ],
        });
      }),
    );

    await page.viewport?.(1280, 720);
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

    // Wait for feeds to render
    await expect.element(page.getByText("Past Feed")).toBeInTheDocument();
    await expect.element(page.getByText("Future Feed")).toBeInTheDocument();

    // The past feed should display "Soon"
    const soonText = page.getByText("Next fetch: Soon");
    await expect.element(soonText).toBeInTheDocument();
    // And only the past feed should display "Soon" (future feed should show a relative time)
    await expect.poll(async () => (await soonText.all()).length).toBe(1);
  });
});

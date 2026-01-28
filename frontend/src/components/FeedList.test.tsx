import { useLiveQuery } from "@tanstack/solid-db";
import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import * as db from "../lib/db";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";

// Mock the db module
vi.mock("../lib/db", () => ({
  feeds: {
    delete: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
  },
  items: {
    isReady: vi.fn().mockReturnValue(true),
  },
  addFeed: vi.fn(),
  updateItemStatus: vi.fn(),
}));

// Mock useLiveQuery
vi.mock("@tanstack/solid-db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/solid-db")>();
  return {
    ...actual,
    useLiveQuery: vi.fn(),
  };
});

// Mock Link from solid-router to avoid Context issues
vi.mock("@tanstack/solid-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/solid-router")>();
  return {
    ...actual,
    // biome-ignore lint/suspicious/noExplicitAny: Mocking external library component
    Link: (props: any) => (
      <a href={props.to} {...props}>
        {props.children}
      </a>
    ),
  };
});

describe("FeedList", () => {
  let dispose: () => void;

  beforeEach(() => {
    queryClient.clear();
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const TestWrapper = (props: { children: JSX.Element }) => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </TransportProvider>
  );

  it("displays a list of feeds", async () => {
    // Setup mock return for useLiveQuery
    const mockFeeds = [
      {
        id: "1",
        title: "Feed 1",
        url: "http://example.com/1",
        tags: [{ id: "t1", name: "Tag 1" }],
      },
      { id: "2", title: "Feed 2", url: "http://example.com/2", tags: [] },
    ];

    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

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

    await expect.element(page.getByText("Feed 1")).toBeInTheDocument();
    await expect.element(page.getByText("Tag 1")).toBeInTheDocument();
    await expect.element(page.getByText("Feed 2")).toBeInTheDocument();
  });

  it("deletes a feed", async () => {
    const mockFeeds = [
      { id: "1", title: "Feed 1", url: "http://example.com/1", tags: [] },
    ];
    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

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

    await expect.element(page.getByText("Feed 1")).toBeInTheDocument();

    const deleteButton = page.getByText("Delete");
    await deleteButton.click();

    expect(db.feeds.delete).toHaveBeenCalledWith("1");
  });

  it("supports bulk selection", async () => {
    const mockFeeds = [
      { id: "1", title: "Feed 1", url: "u1", tags: [] },
      { id: "2", title: "Feed 2", url: "u2", tags: [] },
    ];
    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

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

    await expect.element(page.getByText("Feed 1")).toBeInTheDocument();

    // Select first feed
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);

    // Using native click as vitest-browser click might be tricky with multiple elements sometimes
    (checkboxes[0] as HTMLInputElement).click();

    // Now "Manage Tags (1)" should be visible
    const manageButton = page.getByText("Manage Tags (1)");
    await expect.element(manageButton).toBeInTheDocument();
  });

  it("manages tags for selected feeds", async () => {
    const mockFeeds = [{ id: "1", title: "Feed 1", url: "u1", tags: [] }];
    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

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

    // Give time for initial load
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 1. Select feed
    const checkbox = document.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    if (!checkbox) {
      console.log("BODY HTML:", document.body.innerHTML);
      throw new Error("Checkbox not found");
    }
    checkbox.click();

    // 2. Click Manage Tags
    const manageButton = page.getByText("Manage Tags (1)");
    await manageButton.click();

    // 3. Modal should be open
    await expect
      .element(page.getByText("Manage Tags for 1 feeds"))
      .toBeInTheDocument();

    // 4. Click Add for Tech tag
    const addButton = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent === "Add",
    );
    if (!addButton) throw new Error("Add button not found");
    addButton.click();

    // Give time for state update
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 5. Click Save Changes
    const saveButton = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent === "Save Changes",
    );
    if (!saveButton) throw new Error("Save Changes button not found");
    saveButton.click();

    // Give time for mutation and close
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 6. Modal should close (button should disappear)
    const manageButtonAfter = Array.from(
      document.querySelectorAll("button"),
    ).find((b) => b.textContent?.includes("Manage Tags"));
    expect(manageButtonAfter).toBeUndefined();
  });

  it("does NOT have a navigation link to feed details", async () => {
    const mockFeeds = [{ uuid: "1", title: "Feed 1", url: "u1", tags: [] }];
    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

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

    // Ensure the navigation icon link is not present
    const viewItemsLink = page.getByRole("link", { name: /View items/i });
    await expect.element(viewItemsLink).not.toBeInTheDocument();
  });

  it("displays the last fetched date", async () => {
    const lastFetchedAt = "2026-01-28T15:30:00Z";
    const mockFeeds = [
      {
        id: "1",
        title: "Fetched Feed",
        url: "http://example.com/1",
        lastFetchedAt: lastFetchedAt,
        tags: [],
      },
      {
        id: "2",
        title: "Never Fetched Feed",
        url: "http://example.com/2",
        lastFetchedAt: null,
        tags: [],
      },
    ];

    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

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

    // Should display formatted date
    await expect.element(page.getByText("Last fetched: 2026-01-28 15:30")).toBeInTheDocument();
    // Should display "Never" for null date
    await expect.element(page.getByText("Last fetched: Never")).toBeInTheDocument();
  });
});

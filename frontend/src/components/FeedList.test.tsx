import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { FeedList } from "./FeedList";
import * as db from "../lib/db";

// Mock the db module
vi.mock("../lib/db", () => ({
  feeds: {
    delete: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
  },
}));

// Mock useLiveQuery
vi.mock("@tanstack/solid-db", () => ({
  useLiveQuery: vi.fn(),
}));

import { useLiveQuery } from "@tanstack/solid-db";

describe("FeedList", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("displays a list of feeds", async () => {
    // Setup mock return for useLiveQuery
    const mockFeeds = [
      { uuid: "1", title: "Feed 1", url: "http://example.com/1" },
      { uuid: "2", title: "Feed 2", url: "http://example.com/2" },
    ];
    
    // useLiveQuery returns { data: ... } in our component usage
    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as any);

    // Mock router Link? Or wrap in Router.
    // Since Link is used, we need Router.
    const { createMemoryHistory, createRouter, RouterProvider } = await import("@tanstack/solid-router");
    const { routeTree } = await import("../routeTree.gen");
    
    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <RouterProvider router={router}>
          <FeedList />
        </RouterProvider>
      ),
      document.body
    );

    await expect.element(page.getByText("Feed 1")).toBeInTheDocument();
    await expect.element(page.getByText("Feed 2")).toBeInTheDocument();
  });

  it("deletes a feed", async () => {
    const mockFeeds = [
      { uuid: "1", title: "Feed 1", url: "http://example.com/1" },
    ];
    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as any);

    const { createMemoryHistory, createRouter, RouterProvider } = await import("@tanstack/solid-router");
    const { routeTree } = await import("../routeTree.gen");
    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <RouterProvider router={router}>
          <FeedList />
        </RouterProvider>
      ),
      document.body
    );

    await expect.element(page.getByText("Feed 1")).toBeInTheDocument();

    const deleteButton = page.getByText("Delete");
    await deleteButton.click();

    expect(db.feeds.delete).toHaveBeenCalledWith("1");
  });
});
import {
  createMemoryHistory,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { worker } from "../mocks/browser";
import { Route as RootRoute } from "../routes/__root";
import "../styles.css";

// Unmock solid-router to test component integration
vi.unmock("@tanstack/solid-router");

describe("Root PWA Badge Integration", () => {
  let dispose: () => void;

  beforeEach(() => {
    vi.stubGlobal("navigator", {
      ...navigator,
      setAppBadge: vi.fn().mockResolvedValue(undefined),
      clearAppBadge: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("updates PWA badge based on unread items from API", async () => {
    // 0. Reset DB before starting to ensure a clean state
    const { resetDatabase } = await import("../lib/db");
    resetDatabase();

    // 1. Setup mock index route
    const indexRoute = createRoute({
      getParentRoute: () => RootRoute,
      path: "/",
      component: () => <div>Home</div>,
    });
    const routeTree = RootRoute.addChildren([indexRoute]);
    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    // 2. Mock API to return 5 unread items
    worker.use(
      http.all("*/item.v1.ItemService/ListItems", () => {
        return HttpResponse.json({
          items: Array.from({ length: 5 }, (_, i) => ({
            id: `item-${i}`,
            title: `Item ${i}`,
            isRead: false,
            publishedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            feedId: "feed-1",
          })),
          totalCount: 5,
        });
      }),
    );

    // 3. Render
    dispose = render(() => <RouterProvider router={router} />, document.body);

    // 4. Wait for PWA badge to update
    await expect.poll(() => navigator.setAppBadge).toHaveBeenCalledWith(5);

    // 5. Mock API to return 0 unread items
    worker.use(
      http.all("*/item.v1.ItemService/ListItems", () => {
        return HttpResponse.json({
          items: [],
          totalCount: 0,
        });
      }),
    );

    // Trigger a refetch by resetting DB (which causes live query to re-evaluate)
    resetDatabase();

    await expect.poll(() => navigator.clearAppBadge).toHaveBeenCalled();
  });
});

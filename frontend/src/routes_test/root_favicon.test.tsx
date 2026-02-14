import {
  createMemoryHistory,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { http, HttpResponse } from "msw";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { worker } from "../mocks/browser";
import { Route as RootRoute } from "../routes/__root";
import "../styles.css";

// Unmock solid-router to test component integration
vi.unmock("@tanstack/solid-router");

describe("Root Favicon Integration", () => {
  let dispose: () => void;

  beforeEach(() => {
    // Ensure we have a favicon link in the head
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = '/favicon.svg';
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    // Reset favicon
    const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (link) {
      link.href = '/favicon.svg';
    }
  });

  it("updates favicon based on unread items from API", async () => {
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
      http.post("*/item.v1.ItemService/ListItems", () => {
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

    // 4. Wait for favicon to update (any dynamic update)
    await vi.waitFor(() => {
      const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      // It should NOT be the default anymore
      expect(link.href).toContain('data:image/svg+xml;base64,');
    }, { timeout: 10000 });

    // 5. Verify it's NOT Neutral if there are items (count will be at least 5)
    const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    const base64 = link.href.split(',')[1];
    const svg = atob(base64);
    // Neutral color is #6b7280. Blue is #3b82f6. Red is #ef4444.
    expect(svg).not.toContain('fill="#6b7280"');

    // 6. Mock API to return 0 unread items
    worker.use(
      http.post("*/item.v1.ItemService/ListItems", () => {
        return HttpResponse.json({
          items: [],
          totalCount: 0,
        });
      }),
    );

    // Trigger a refetch via a state change or manual reset
    // Resetting database is the most reliable way to clear the 'append' behavior in tests
    resetDatabase();

    await vi.waitFor(() => {
      const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      const base64 = link.href.split(',')[1];
      const svg = atob(base64);
      // Neutral color is #6b7280 for count 0
      expect(svg).toContain('fill="#6b7280"');
    }, { timeout: 10000 });
  });
});

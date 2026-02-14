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

describe("Root Favicon Integration", () => {
  let dispose: () => void;

  beforeEach(() => {
    // Ensure we have a favicon link in the head
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = "/favicon.svg";
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    // Reset favicon
    const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (link) {
      link.href = "/favicon.svg";
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

    // 4. Wait for favicon to update (color Blue for count 5)
    await vi.waitFor(
      () => {
        const link = document.querySelector(
          'link[rel="icon"]',
        ) as HTMLLinkElement;
        const base64 = link.href.split(",")[1];
        const svg = atob(base64);
        // Blue color is #3b82f6
        expect(svg).toContain('fill="#3b82f6"');
      },
      { timeout: 10000 },
    );

    // 5. Mock API to return 250 unread items (Orange)
    worker.use(
      http.post("*/item.v1.ItemService/ListItems", () => {
        return HttpResponse.json({
          items: Array.from({ length: 250 }, (_, i) => ({
            id: `item-${i}`,
            title: `Item ${i}`,
            isRead: false,
            publishedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            feedId: "feed-1",
          })),
          totalCount: 250,
        });
      }),
    );

    // Trigger a refetch
    resetDatabase();

    await vi.waitFor(
      () => {
        const link = document.querySelector(
          'link[rel="icon"]',
        ) as HTMLLinkElement;
        const base64 = link.href.split(",")[1];
        const svg = atob(base64);
        // Orange color is #f97316
        expect(svg).toContain('fill="#f97316"');
      },
      { timeout: 10000 },
    );

    // 6. Mock API to return 1000 unread items (Red)
    worker.use(
      http.post("*/item.v1.ItemService/ListItems", () => {
        return HttpResponse.json({
          items: Array.from({ length: 1000 }, (_, i) => ({
            id: `item-${i}`,
            title: `Item ${i}`,
            isRead: false,
            publishedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            feedId: "feed-1",
          })),
          totalCount: 1000,
        });
      }),
    );

    // Trigger a refetch
    resetDatabase();

    await vi.waitFor(
      () => {
        const link = document.querySelector(
          'link[rel="icon"]',
        ) as HTMLLinkElement;
        const base64 = link.href.split(",")[1];
        const svg = atob(base64);
        // Red color is #ef4444
        expect(svg).toContain('fill="#ef4444"');
      },
      { timeout: 10000 },
    );

    // 7. Mock API to return 0 unread items (Blue)
    worker.use(
      http.post("*/item.v1.ItemService/ListItems", () => {
        return HttpResponse.json({
          items: [],
          totalCount: 0,
        });
      }),
    );

    // Trigger a refetch
    resetDatabase();

    await vi.waitFor(
      () => {
        const link = document.querySelector(
          'link[rel="icon"]',
        ) as HTMLLinkElement;
        const base64 = link.href.split(",")[1];
        const svg = atob(base64);
        // Blue color is #3b82f6
        expect(svg).toContain('fill="#3b82f6"');
      },
      { timeout: 10000 },
    );
  });
});

import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "@solidjs/web";
import { delay, http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient } from "../lib/query";
import { worker } from "../mocks/browser";
import { Route as RootRoute } from "../routes/__root";
import "../styles.css";

// Unmock solid-router to test active link logic
vi.unmock("@tanstack/solid-router");

describe("RootComponent Navigation", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    queryClient.clear();
    vi.clearAllMocks();
  });

  it("applies active styles to the current route link", async () => {
    // Define a dummy index component
    const IndexComponent = () => <div>Index Page Content</div>;

    const indexRoute = createRoute({
      getParentRoute: () => RootRoute,
      path: "/",
      component: IndexComponent,
    });

    const routeTree = RootRoute.addChildren([indexRoute]);

    // 2. Create Router
    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    // 3. Render
    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      ),
      document.body,
    );

    // 4. Verify Content
    await expect
      .element(page.getByText("Index Page Content"))
      .toBeInTheDocument();

    // 5. Verify Navigation Links
    const homeLink = page.getByRole("link", { name: "Home" });
    const feedsLink = page.getByRole("link", { name: "Feeds" });

    await expect.element(homeLink).toBeInTheDocument();
    await expect.element(feedsLink).toBeInTheDocument();

    // Verify Header Container Style
    const headerContainer = page.getByRole("banner");
    await expect.element(headerContainer).toHaveStyle({
      paddingTop: "8px",
      borderBottomColor: "oklch(0.967 0.003 264.542)",
    });

    // 6. Verify Active State
    // Expecting a bottom border and background color for active links.
    await expect.element(homeLink).toHaveStyle({
      borderBottomWidth: "2px",
      borderBottomStyle: "solid",
      borderBottomColor: "oklch(0.546 0.245 262.881)", // blue.600
      color: "oklch(0.488 0.243 264.376)", // blue.700
      backgroundColor: "oklch(0.97 0.014 254.604)", // blue.50
    });

    // Verify inactive link does NOT have it
    await expect.element(feedsLink).not.toHaveStyle({
      borderBottomWidth: "2px",
    });
    await expect.element(feedsLink).toHaveStyle({
      color: "oklch(0.551 0.027 264.364)", // gray.500
    });
  });

  it("mounts navigation header immediately while queries are pending", async () => {
    // Delay items, reads, and feed-tags infinitely to simulate in-flight fetching
    worker.use(
      http.all("*/api/v2/items", async () => {
        await delay("infinite");
        return HttpResponse.json({});
      }),
      http.all("*/api/v2/item-reads", async () => {
        await delay("infinite");
        return HttpResponse.json({});
      }),
      http.all("*/api/v2/feed-tags", async () => {
        await delay("infinite");
        return HttpResponse.json({});
      }),
    );

    const IndexComponent = () => <div>Index Page Content</div>;
    const indexRoute = createRoute({
      getParentRoute: () => RootRoute,
      path: "/",
      component: IndexComponent,
    });
    const routeTree = RootRoute.addChildren([indexRoute]);
    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      ),
      document.body,
    );

    // Navigation links must be in the document immediately without waiting for queries
    await expect
      .element(page.getByRole("link", { name: "Home" }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: "Feeds" }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: "Tags" }))
      .toBeInTheDocument();
  });

  it("renders loading fallback for child outlet while child is pending", async () => {
    const PendingComponent = async () => {
      await new Promise(() => {});
      return <div>Pending Content</div>;
    };
    const indexRoute = createRoute({
      getParentRoute: () => RootRoute,
      path: "/",
      component: PendingComponent,
    });
    const routeTree = RootRoute.addChildren([indexRoute]);
    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      ),
      document.body,
    );

    // Navigation links mount immediately
    await expect
      .element(page.getByRole("link", { name: "Home" }))
      .toBeInTheDocument();
    // Fallback loading indicator is displayed
    await expect.element(page.getByText("Loading page...")).toBeInTheDocument();
  });
});

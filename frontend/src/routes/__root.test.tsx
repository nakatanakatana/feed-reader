import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import "../styles.css";
import { Route as RootRoute } from "./__root";

// Unmock solid-router to test active link logic
vi.unmock("@tanstack/solid-router");

describe("RootComponent Navigation", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
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
    dispose = render(() => <RouterProvider router={router} />, document.body);

    // 4. Verify Content
    await expect.element(page.getByText("Index Page Content")).toBeInTheDocument();

    // 5. Verify Navigation Links
    const homeLink = page.getByRole("link", { name: "Home" });
    const feedsLink = page.getByRole("link", { name: "Feeds" });

    await expect.element(homeLink).toBeInTheDocument();
    await expect.element(feedsLink).toBeInTheDocument();

    // 6. Verify Active State
    // Current implementation uses fontWeight: "bold"
    await expect.element(homeLink).toHaveStyle({
      fontWeight: "700", // "bold" is often 700
    });

    // Verify inactive link does NOT have it
    await expect.element(feedsLink).not.toHaveStyle({
      fontWeight: "700",
    });
  });
});
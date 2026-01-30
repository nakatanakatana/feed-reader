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
import { Route as RootRoute } from "./__root";
import "../styles.css";

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

    // Verify Header Container Style
    const headerContainer = page.getByRole("banner");
    await expect.element(headerContainer).toHaveStyle({
      "padding-top": "8px",
    });
    await expect.element(headerContainer).toHaveStyle({
      "border-bottom-color": "rgb(243, 244, 246)",
    });

    // 6. Verify Active State - RED PHASE
    // Expecting a bottom border and background color for active links.
    await expect.element(homeLink).toHaveStyle({
      borderBottomWidth: "2px",
      borderBottomStyle: "solid",
      // We don't know the exact color yet, but we expect *some* background color change
      // or at least that it's not transparent/initial if we use a pill shape.
    });

    // Verify inactive link does NOT have it
    await expect.element(feedsLink).not.toHaveStyle({
      borderBottomWidth: "2px",
    });
  });
});

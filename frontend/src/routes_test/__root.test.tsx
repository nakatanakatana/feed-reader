import {
  createMemoryHistory,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { Route as RootRoute } from "../routes/__root";
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
      "padding-top": "8px",
    });
    await expect.element(headerContainer).toHaveStyle({
      "border-bottom-color": "rgb(243, 244, 246)",
    });

    // 6. Verify Active State
    // Expecting a bottom border and background color for active links.
    await expect.element(homeLink).toHaveStyle({
      "border-bottom-width": "2px",
      "border-bottom-style": "solid",
      "border-bottom-color": "rgb(37, 99, 235)", // blue.600
      color: "rgb(29, 78, 216)", // blue.700
      "background-color": "rgb(239, 246, 255)", // blue.50
    });

    // Verify inactive link does NOT have it
    await expect.element(feedsLink).not.toHaveStyle({
      "border-bottom-width": "2px",
    });
    await expect.element(feedsLink).toHaveStyle({
      color: "rgb(107, 114, 128)", // gray.500
    });
  });
});

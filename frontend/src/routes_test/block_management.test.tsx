import {
  createMemoryHistory,
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

describe("Block Management Navigation", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should have navigation links for URL Rules and Block Rules", async () => {
    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree: RootRoute, history });

    dispose = render(() => <RouterProvider router={router} />, document.body);

    const urlRulesLink = page.getByRole("link", { name: "URL Rules" });
    const blockRulesLink = page.getByRole("link", { name: "Block Rules" });

    await expect.element(urlRulesLink).toBeInTheDocument();
    await expect.element(blockRulesLink).toBeInTheDocument();
  });
});

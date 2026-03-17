import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { routeTree } from "../routeTree.gen";
import "../styles.css";
import { create } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import {
  ItemService,
  ListItemBlockRulesResponseSchema,
  ListURLParsingRulesResponseSchema,
} from "../gen/item/v1/item_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { mockConnectWeb } from "../mocks/connect";

// Unmock solid-router to test active link logic
vi.unmock("@tanstack/solid-router");

const mockItemService = mockConnectWeb(ItemService);

describe("Block Management Navigation", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("should have navigation links for URL Rules and Block Rules", async () => {
    worker.use(
      mockItemService({
        method: "listURLParsingRules",
        handler: () => create(ListURLParsingRulesResponseSchema, { rules: [] }),
      }),
      mockItemService({
        method: "listItemBlockRules",
        handler: () => create(ListItemBlockRulesResponseSchema, { rules: [] }),
      }),
    );

    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    const urlRulesLink = page.getByRole("link", { name: "URL Rules" });
    const blockRulesLink = page.getByRole("link", { name: "Block Rules" });

    await expect.element(urlRulesLink).toBeInTheDocument();
    await expect.element(blockRulesLink).toBeInTheDocument();

    // Test navigation to URL Rules
    await urlRulesLink.click();
    await expect.element(page.getByText("Domain", { exact: true })).toBeInTheDocument();
    await expect.element(page.getByText("Pattern", { exact: true })).toBeInTheDocument();

    // Test navigation to Block Rules
    await blockRulesLink.click();
    await expect.element(page.getByText("Value", { exact: true }).first()).toBeInTheDocument();
    await expect.element(page.getByText("Domain (Optional)", { exact: true })).toBeInTheDocument();
  });
});

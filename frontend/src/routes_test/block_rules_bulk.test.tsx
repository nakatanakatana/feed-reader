import { create } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import {
  AddItemBlockRulesResponseSchema,
  ItemService,
  ListItemBlockRulesResponseSchema,
} from "../gen/item/v1/item_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { mockConnectWeb } from "../mocks/connect";
import { routeTree } from "../routeTree.gen";

const mockItemService = mockConnectWeb(ItemService);

describe("BlockRules page bulk add button", () => {
  let dispose: () => void;

  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  it("should have Bulk Add button", async () => {
    worker.use(
      mockItemService({
        method: "listItemBlockRules",
        handler: () => create(ListItemBlockRulesResponseSchema, { rules: [] }),
      }),
    );

    const history = createMemoryHistory({ initialEntries: ["/block-rules"] });
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

    await expect
      .element(page.getByRole("button", { name: "Bulk Add", exact: true }))
      .toBeInTheDocument();
  });

  it("should open modal when Bulk Add button is clicked", async () => {
    worker.use(
      mockItemService({
        method: "listItemBlockRules",
        handler: () => create(ListItemBlockRulesResponseSchema, { rules: [] }),
      }),
    );

    const history = createMemoryHistory({ initialEntries: ["/block-rules"] });
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

    const bulkAddButton = page.getByRole("button", {
      name: "Bulk Add",
      exact: true,
    });
    await bulkAddButton.click();

    await expect.element(page.getByText("Bulk Add Block Rules")).toBeInTheDocument();
  });

  it("should submit valid rules to the backend", async () => {
    const addItemBlockRulesSpy = vi
      .fn()
      .mockReturnValue(create(AddItemBlockRulesResponseSchema, {}));

    worker.use(
      mockItemService({
        method: "listItemBlockRules",
        handler: () => create(ListItemBlockRulesResponseSchema, { rules: [] }),
      }),
      mockItemService({
        method: "addItemBlockRules",
        handler: addItemBlockRulesSpy,
      }),
    );

    const history = createMemoryHistory({ initialEntries: ["/block-rules"] });
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

    // Open modal
    await page.getByRole("button", { name: "Bulk Add", exact: true }).click();

    // Fill CSV
    const textarea = page.getByPlaceholder(/user,john_doe/);
    await textarea.fill(`user,john_doe
domain,example.com`);

    // Click Register
    const registerButton = page.getByRole("button", {
      name: /Register \(2 rules\)/,
    });
    await registerButton.click();

    // Verify backend call
    await expect.poll(() => addItemBlockRulesSpy).toHaveBeenCalled();
    const callArgs = addItemBlockRulesSpy.mock.calls[0][0];
    expect(callArgs.rules).toHaveLength(2);
    expect(callArgs.rules[0]).toMatchObject({
      ruleType: "user",
      value: "john_doe",
    });
    expect(callArgs.rules[1]).toMatchObject({
      ruleType: "domain",
      value: "example.com",
    });

    // Verify success message and Done button
    await expect.element(page.getByText("Successfully registered rules!")).toBeInTheDocument();
    const doneButton = page.getByRole("button", { name: "Done" });
    await doneButton.click();

    // Verify modal is closed
    await expect.element(page.getByText("Bulk Add Block Rules")).not.toBeInTheDocument();
  });
});

import { create } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import "../styles.css";
import {
  AddItemBlockRulesResponseSchema,
  DeleteItemBlockRuleResponseSchema,
  type ItemBlockRule,
  ItemBlockRuleSchema,
  ItemService,
  ListItemBlockRulesResponseSchema,
} from "../gen/item/v1/item_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { mockConnectWeb } from "../mocks/connect";
import { routeTree } from "../routeTree.gen";

// Unmock solid-router to test active link logic
vi.unmock("@tanstack/solid-router");

const mockItemService = mockConnectWeb(ItemService);

describe("Block Rules Page", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should fetch and display item block rules", async () => {
    const rules = [
      create(ItemBlockRuleSchema, {
        id: "1",
        ruleType: "domain",
        value: "blocked-domain.com",
      }),
      create(ItemBlockRuleSchema, {
        id: "2",
        ruleType: "keyword",
        value: "spam-keyword",
      }),
    ];

    worker.use(
      mockItemService({
        method: "listItemBlockRules",
        handler: () => create(ListItemBlockRulesResponseSchema, { rules }),
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

    await expect.element(page.getByText("blocked-domain.com").first()).toBeInTheDocument();
    await expect.element(page.getByText("spam-keyword").first()).toBeInTheDocument();

    // Snapshot testing with document.body.innerHTML as per project convention
    // Mask random IDs generated during render
    const html = document.body.innerHTML.replace(/id="[0-9.]+"/g, 'id="MASKED_ID"');
    expect(html).toMatchSnapshot();
  });

  it("should allow adding a new item block rule", async () => {
    const rules: ItemBlockRule[] = [];

    worker.use(
      mockItemService({
        method: "listItemBlockRules",
        handler: () => create(ListItemBlockRulesResponseSchema, { rules }),
      }),
      mockItemService({
        method: "addItemBlockRules",
        handler: (req) => {
          for (const r of req.rules) {
            const newRule = create(ItemBlockRuleSchema, {
              id: Math.random().toString(),
              ruleType: r.ruleType,
              value: r.value,
              domain: r.domain,
            });
            rules.push(newRule);
          }
          return create(AddItemBlockRulesResponseSchema, {});
        },
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

    const typeSelect = page.getByLabelText("Type", { exact: true });
    const valueInput = page.getByLabelText("Value");
    const addButton = page.getByRole("button", { name: "Add", exact: true });

    await typeSelect.selectOptions("keyword");
    await valueInput.fill("new-block-keyword");
    await addButton.click();

    await expect.element(page.getByText("new-block-keyword").first()).toBeInTheDocument();
  });

  it("should allow adding a new item block rule with domain (user_domain)", async () => {
    const rules: ItemBlockRule[] = [];

    worker.use(
      mockItemService({
        method: "listItemBlockRules",
        handler: () => create(ListItemBlockRulesResponseSchema, { rules }),
      }),
      mockItemService({
        method: "addItemBlockRules",
        handler: (req) => {
          for (const r of req.rules) {
            const newRule = create(ItemBlockRuleSchema, {
              id: Math.random().toString(),
              ruleType: r.ruleType,
              value: r.value,
              domain: r.domain,
            });
            rules.push(newRule);
          }
          return create(AddItemBlockRulesResponseSchema, {});
        },
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

    const typeSelect = page.getByLabelText("Type", { exact: true });
    const valueInput = page.getByLabelText("Value");
    const domainInput = page.getByLabelText("Domain (Optional)");
    const addButton = page.getByRole("button", { name: "Add", exact: true });

    await typeSelect.selectOptions("user_domain");
    await valueInput.fill("blocked-user");
    await domainInput.fill("example.com");
    await addButton.click();

    await expect.element(page.getByText("blocked-user").first()).toBeInTheDocument();
    await expect.element(page.getByText("@example.com").first()).toBeInTheDocument();
  });

  it("should allow deleting an item block rule", async () => {
    let rules = [
      create(ItemBlockRuleSchema, {
        id: "1",
        ruleType: "domain",
        value: "to-delete.com",
      }),
    ];

    worker.use(
      mockItemService({
        method: "listItemBlockRules",
        handler: () => create(ListItemBlockRulesResponseSchema, { rules }),
      }),
      mockItemService({
        method: "deleteItemBlockRule",
        handler: (req) => {
          rules = rules.filter((r) => r.id !== req.id);
          return create(DeleteItemBlockRuleResponseSchema, {});
        },
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

    await expect.element(page.getByText("to-delete.com").first()).toBeInTheDocument();

    const deleteButton = page.getByRole("button", { name: "Delete" }).first();
    await deleteButton.click();

    await expect.element(page.getByText("to-delete.com").first()).not.toBeInTheDocument();
  });
});

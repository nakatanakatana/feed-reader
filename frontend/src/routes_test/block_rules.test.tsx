import { create } from "@bufbuild/protobuf";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { routeTree } from "../routeTree.gen";
import "../styles.css";
import { QueryClientProvider } from "@tanstack/solid-query";
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

// Unmock solid-router to test active link logic
vi.unmock("@tanstack/solid-router");

const mockItemService = mockConnectWeb(ItemService);

describe("Block Rules Page", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    queryClient.clear();
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

    await expect
      .element(page.getByText("blocked-domain.com"))
      .toBeInTheDocument();
    await expect.element(page.getByText("spam-keyword")).toBeInTheDocument();
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

    const typeSelect = page.getByLabelText("Type");
    const valueInput = page.getByLabelText("Value");
    const addButton = page.getByRole("button", { name: "Add" });

    await typeSelect.selectOptions("keyword");
    await valueInput.fill("new-block-keyword");
    await addButton.click();

    await expect
      .element(page.getByText("new-block-keyword"))
      .toBeInTheDocument();
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

    const typeSelect = page.getByLabelText("Type");
    const valueInput = page.getByLabelText("Value");
    const domainInput = page.getByLabelText("Domain (Optional)");
    const addButton = page.getByRole("button", { name: "Add" });

    await typeSelect.selectOptions("user_domain");
    await valueInput.fill("blocked-user");
    await domainInput.fill("example.com");
    await addButton.click();

    await expect.element(page.getByText("blocked-user")).toBeInTheDocument();
    await expect.element(page.getByText("@example.com")).toBeInTheDocument();
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

    await expect.element(page.getByText("to-delete.com")).toBeInTheDocument();

    const deleteButton = page.getByRole("button", { name: "Delete" });
    await deleteButton.click();

    await expect
      .element(page.getByText("to-delete.com"))
      .not.toBeInTheDocument();
  });
});

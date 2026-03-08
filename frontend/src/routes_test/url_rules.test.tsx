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
  AddURLParsingRuleResponseSchema,
  DeleteURLParsingRuleResponseSchema,
  ItemService,
  ListURLParsingRulesResponseSchema,
  type URLParsingRule,
  URLParsingRuleSchema,
} from "../gen/item/v1/item_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { mockConnectWeb } from "../mocks/connect";

// Unmock solid-router to test active link logic
vi.unmock("@tanstack/solid-router");

const mockItemService = mockConnectWeb(ItemService);

describe("URL Rules Page", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("should fetch and display URL parsing rules", async () => {
    const rules = [
      create(URLParsingRuleSchema, {
        id: "1",
        domain: "example.com",
        ruleType: "subdomain",
        pattern: "test",
      }),
      create(URLParsingRuleSchema, {
        id: "2",
        domain: "test.com",
        ruleType: "path",
        pattern: "/abc",
      }),
    ];

    worker.use(
      mockItemService({
        method: "listURLParsingRules",
        handler: () => create(ListURLParsingRulesResponseSchema, { rules }),
      }),
    );

    const history = createMemoryHistory({ initialEntries: ["/url-rules"] });
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

    await expect.element(page.getByText("example.com")).toBeInTheDocument();
    await expect.element(page.getByText("test.com")).toBeInTheDocument();
  });

  it("should allow adding a new URL parsing rule", async () => {
    const rules: URLParsingRule[] = [];

    worker.use(
      mockItemService({
        method: "listURLParsingRules",
        handler: () => create(ListURLParsingRulesResponseSchema, { rules }),
      }),
      mockItemService({
        method: "addURLParsingRule",
        handler: (req) => {
          const newRule = create(URLParsingRuleSchema, {
            id: "3",
            domain: req.domain,
            ruleType: req.ruleType,
            pattern: req.pattern,
          });
          rules.push(newRule);
          return create(AddURLParsingRuleResponseSchema, { rule: newRule });
        },
      }),
    );

    const history = createMemoryHistory({ initialEntries: ["/url-rules"] });
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

    const domainInput = page.getByLabelText("Domain");
    const typeSelect = page.getByLabelText("Type");
    const patternInput = page.getByLabelText("Pattern");
    const addButton = page.getByRole("button", { name: "Add" });

    await domainInput.fill("new-domain.com");
    await typeSelect.selectOptions("path");
    await patternInput.fill("new-pattern");
    await addButton.click();

    await expect.element(page.getByText("new-domain.com")).toBeInTheDocument();
    await expect
      .element(page.getByRole("listitem").getByText("path"))
      .toBeInTheDocument();
  });

  it("should allow deleting a URL parsing rule", async () => {
    let rules = [
      create(URLParsingRuleSchema, {
        id: "1",
        domain: "example.com",
        ruleType: "subdomain",
        pattern: "test",
      }),
    ];

    worker.use(
      mockItemService({
        method: "listURLParsingRules",
        handler: () => create(ListURLParsingRulesResponseSchema, { rules }),
      }),
      mockItemService({
        method: "deleteURLParsingRule",
        handler: (req) => {
          rules = rules.filter((r) => r.id !== req.id);
          return create(DeleteURLParsingRuleResponseSchema, {});
        },
      }),
    );

    const history = createMemoryHistory({ initialEntries: ["/url-rules"] });
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

    await expect.element(page.getByText("example.com")).toBeInTheDocument();

    const deleteButton = page.getByRole("button", { name: "Delete" }).first();
    await deleteButton.click();

    await expect.element(page.getByText("example.com")).not.toBeInTheDocument();
  });
});

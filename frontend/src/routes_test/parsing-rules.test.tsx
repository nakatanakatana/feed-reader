import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import {
  BlockingService,
  CreateURLParsingRuleResponseSchema,
  ListURLParsingRulesResponseSchema,
  URLParsingRuleSchema,
} from "../gen/blocking/v1/blocking_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { mockConnectWeb } from "../mocks/connect";
import { routeTree } from "../routeTree.gen";

describe("Parsing Rules Route", () => {
  let dispose: () => void;
  const mockRules: any[] = [];

  beforeEach(() => {
    mockRules.length = 0;
    queryClient.clear();
    worker.use(
      mockConnectWeb(BlockingService)({
        method: "listURLParsingRules",
        handler: () => {
          return create(ListURLParsingRulesResponseSchema, {
            rules: mockRules.map((r) => create(URLParsingRuleSchema, r)),
          });
        },
      }),
      mockConnectWeb(BlockingService)({
        method: "createURLParsingRule",
        handler: (req) => {
          const now = new Date().toISOString();
          const newRule = {
            id: `new-rule-${Math.random()}`,
            domain: req.domain,
            pattern: req.pattern,
            createdAt: now,
            updatedAt: now,
          };
          mockRules.push(newRule);
          return create(CreateURLParsingRuleResponseSchema, {
            rule: create(URLParsingRuleSchema, newRule),
          });
        },
      }),
      mockConnectWeb(BlockingService)({
        method: "deleteURLParsingRule",
        handler: (req) => {
          const index = mockRules.findIndex((r) => r.id === req.id);
          if (index !== -1) {
            mockRules.splice(index, 1);
          }
          return {};
        },
      }),
    );
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const renderRoute = () => {
    const history = createMemoryHistory({
      initialEntries: ["/parsing-rules"],
    });
    const router = createRouter({ routeTree, history });

    return render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );
  };

  it("renders the Domain URL Parsing Rules heading", async () => {
    mockRules.push(
      { id: "1", domain: "example.com", pattern: "pattern1" },
      { id: "2", domain: "test.com", pattern: "pattern2" },
    );

    dispose = renderRoute();

    await expect.element(page.getByRole("heading", { name: /Domain URL Parsing Rules/i })).toBeVisible();
    await expect.element(page.getByText("example.com")).toBeVisible();
    await expect.element(page.getByText("test.com")).toBeVisible();
  });

  it("adds a new URL parsing rule via the form", async () => {
    dispose = renderRoute();

    await expect.element(page.getByRole("heading", { name: /Domain URL Parsing Rules/i })).toBeVisible();

    const domainInput = page.getByLabelText("Domain");
    await domainInput.fill("new-domain.com");

    const patternInput = page.getByLabelText(/Regex Pattern/);
    await patternInput.fill("new-pattern");

    const addButton = page.getByRole("button", { name: "Add Rule" });
    await addButton.click();

    await expect
      .poll(async () => {
        const el = page.getByText("new-domain.com");
        return await el.query();
      }, { timeout: 10000 })
      .not.toBeNull();
  });

  it("deletes an existing URL parsing rule", async () => {
    mockRules.push({ id: "del-1", domain: "delete-me.com", pattern: "p1" });

    dispose = renderRoute();

    await expect.element(page.getByText("delete-me.com")).toBeVisible();

    const deleteButton = page.getByRole("button", { name: /Delete/ });
    await deleteButton.click();

    await expect
      .poll(async () => {
        const el = page.getByText("delete-me.com");
        return await el.query();
      }, { timeout: 10000 })
      .toBeNull();
  });
});

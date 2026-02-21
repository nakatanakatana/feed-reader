import { create, toJson } from "@bufbuild/protobuf";
import { createConnectTransport } from "@connectrpc/connect-web";
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
import { routeTree } from "../routeTree.gen";

describe("Parsing Rules Route", () => {
  let dispose: () => void;

  beforeEach(() => {
    queryClient.clear();
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
    const mockRules = [
      { id: "1", domain: "example.com", pattern: "pattern1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: "2", domain: "test.com", pattern: "pattern2", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];

    worker.use(
      http.post("*/blocking.v1.BlockingService/ListURLParsingRules", () => {
        return HttpResponse.json({ rules: mockRules });
      }),
    );

    dispose = renderRoute();

    await expect.element(page.getByRole("heading", { name: /Domain URL Parsing Rules/i })).toBeInTheDocument();
    await expect.element(page.getByText("example.com")).toBeInTheDocument();
    await expect.element(page.getByText("test.com")).toBeInTheDocument();
  });

  it("adds a new URL parsing rule via the form", async () => {
    const mockRules: any[] = [];
    let createCalled = false;
    worker.use(
      http.post("*/blocking.v1.BlockingService/ListURLParsingRules", () => {
        return HttpResponse.json({ rules: mockRules });
      }),
      http.post("*/blocking.v1.BlockingService/CreateURLParsingRule", async ({ request }) => {
        const body = (await request.json()) as any;
        createCalled = true;
        const newRule = {
          id: `new-rule-${Math.random()}`,
          domain: body.domain,
          pattern: body.pattern,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockRules.push(newRule);
        return HttpResponse.json({ rule: newRule });
      }),
    );

    dispose = renderRoute();

    await expect.element(page.getByRole("heading", { name: /Domain URL Parsing Rules/i })).toBeInTheDocument();

    const domainInput = page.getByLabelText("Domain");
    await domainInput.fill("new-domain.com");

    const patternInput = page.getByLabelText(/Regex Pattern/);
    await patternInput.fill("new-pattern");

    const addButton = page.getByRole("button", { name: "Add Rule" });
    await addButton.click();

    await expect.poll(() => createCalled).toBe(true);
    await expect.element(page.getByText("new-domain.com")).toBeInTheDocument();
  });

  it("deletes an existing URL parsing rule", async () => {
    const mockRules = [{
      id: "del-1",
      domain: "delete-me.com",
      pattern: "p1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }];

    worker.use(
      http.post("*/blocking.v1.BlockingService/ListURLParsingRules", () => {
        return HttpResponse.json({ rules: mockRules });
      }),
      http.post("*/blocking.v1.BlockingService/DeleteURLParsingRule", async ({ request }) => {
        const body = (await request.json()) as any;
        const index = mockRules.findIndex((r) => r.id === body.id);
        if (index !== -1) {
          mockRules.splice(index, 1);
        }
        return HttpResponse.json({});
      }),
    );

    dispose = renderRoute();

    await expect.element(page.getByText("delete-me.com")).toBeInTheDocument();

    const deleteButton = page.getByRole("button", { name: /Delete/ });
    await deleteButton.click();

    await expect.element(page.getByText("delete-me.com")).not.toBeInTheDocument();
  });
});

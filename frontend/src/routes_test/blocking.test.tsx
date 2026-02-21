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
  BlockingRuleSchema,
  BlockingService,
  BulkCreateBlockingRulesResponseSchema,
  CreateBlockingRuleResponseSchema,
  ListBlockingRulesResponseSchema,
} from "../gen/blocking/v1/blocking_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("Blocking Route", () => {
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
    const history = createMemoryHistory({ initialEntries: ["/blocking"] });
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

  it("renders the Blocking Rules heading", async () => {
    const mockRules = [
      { id: "1", ruleType: "keyword", keyword: "badword", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      {
        id: "2",
        ruleType: "user_domain",
        domain: "spam.com",
        username: "spammer",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    worker.use(
      http.post("*/blocking.v1.BlockingService/ListBlockingRules", () => {
        return HttpResponse.json({ rules: mockRules });
      }),
    );

    dispose = renderRoute();

    await expect.element(page.getByRole("heading", { name: /Existing Blocking Rules/i })).toBeInTheDocument();
    await expect.element(page.getByText("badword", { exact: true })).toBeInTheDocument();
    await expect.element(page.getByText("spam.com", { exact: true })).toBeInTheDocument();
    await expect.element(page.getByText("spammer", { exact: true })).toBeInTheDocument();
  });

  it("adds a new keyword blocking rule", async () => {
    const mockRules: any[] = [];
    let createCalled = false;
    worker.use(
      http.post("*/blocking.v1.BlockingService/ListBlockingRules", () => {
        return HttpResponse.json({ rules: mockRules });
      }),
      http.post("*/blocking.v1.BlockingService/CreateBlockingRule", async ({ request }) => {
        const body = (await request.json()) as any;
        createCalled = true;
        const now = new Date().toISOString();
        const newRule = {
          id: `new-block-${Math.random()}`,
          ruleType: body.ruleType,
          username: body.username,
          domain: body.domain,
          keyword: body.keyword,
          createdAt: now,
          updatedAt: now,
        };
        mockRules.push(newRule);
        return HttpResponse.json({ rule: newRule });
      }),
    );

    dispose = renderRoute();

    await expect.element(page.getByRole("heading", { name: /Existing Blocking Rules/i })).toBeInTheDocument();

    const typeSelect = page.getByLabelText("Rule Type");
    await typeSelect.selectOptions("keyword");

    const keywordInput = page.getByLabelText("Keyword");
    await keywordInput.fill("BLOCKED_TERM");

    const addButton = page.getByRole("button", { name: "Add Rule" });
    await addButton.click();

    await expect.poll(() => createCalled).toBe(true);
    await expect.element(page.getByText("BLOCKED_TERM", { exact: true })).toBeInTheDocument();
  });

  it("performs bulk import of rules", async () => {
    const mockRules: any[] = [];
    let bulkCreateCalled = false;
    worker.use(
      http.post("*/blocking.v1.BlockingService/ListBlockingRules", () => {
        return HttpResponse.json({ rules: mockRules });
      }),
      http.post("*/blocking.v1.BlockingService/BulkCreateBlockingRules", async ({ request }) => {
        const body = (await request.json()) as any;
        bulkCreateCalled = true;
        const now = new Date().toISOString();
        const newRules = (body.rules || []).map((r: any) => ({
          id: `bulk-${Math.random()}`,
          ...r,
          createdAt: now,
          updatedAt: now,
        }));
        mockRules.push(...newRules);
        return HttpResponse.json({ rules: newRules });
      }),
    );

    dispose = renderRoute();

    await expect.element(page.getByRole("heading", { name: /Bulk Import Blocking Rules/i })).toBeInTheDocument();

    const textarea = page.getByLabelText("Paste rules here");
    await textarea.fill(`keyword,,,bulk1
user_domain,,bulk-spam.com,`);

    const importButton = page.getByRole("button", { name: /Import Rules/ });
    await importButton.click();

    await expect.poll(() => bulkCreateCalled).toBe(true);
    await expect.element(page.getByText("bulk1", { exact: true })).toBeInTheDocument();
    await expect.element(page.getByText("bulk-spam.com", { exact: true })).toBeInTheDocument();
  });
});

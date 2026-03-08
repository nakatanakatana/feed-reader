import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { page } from "@vitest/browser/context";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddItemBlockRulesResponseSchema } from "../gen/item/v1/item_pb";
import { queryClient, transport } from "../lib/query";
import { ToastProvider } from "../lib/toast";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("BlockRules page bulk add button", () => {
  let dispose: (() => void) | undefined;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    queryClient.clear();
    vi.restoreAllMocks();
  });

  const TestWrapper = () => {
    const history = createMemoryHistory({
      initialEntries: ["/block-rules"],
    });
    const router = createRouter({
      routeTree,
      history,
    });
    return (
      <TransportProvider transport={transport}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </QueryClientProvider>
      </TransportProvider>
    );
  };

  it("should have Bulk Add button", async () => {
    dispose = render(() => <TestWrapper />, document.body);

    const bulkAddButton = page.getByRole("button", { name: "Bulk Add" });
    await expect.element(bulkAddButton).toBeInTheDocument();
  });

  it("should open Bulk Add modal when button is clicked", async () => {
    dispose = render(() => <TestWrapper />, document.body);

    const bulkAddButton = page.getByRole("button", { name: "Bulk Add" });
    await bulkAddButton.click();

    const modalTitle = page.getByText("Bulk Add Block Rules");
    await expect.element(modalTitle).toBeInTheDocument();
  });

  it("should submit valid rules to the backend", async () => {
    const addItemBlockRulesSpy = vi
      .fn()
      .mockResolvedValue(create(AddItemBlockRulesResponseSchema, {}));

    // Register mock handler
    worker.use(
      http.post(
        "*/item.v1.ItemService/AddItemBlockRules",
        async ({ request }) => {
          const body = await request.json();
          addItemBlockRulesSpy(body);
          return HttpResponse.json(
            toJson(
              AddItemBlockRulesResponseSchema,
              create(AddItemBlockRulesResponseSchema, {}),
            ),
          );
        },
      ),
    );

    dispose = render(() => <TestWrapper />, document.body);

    // Open Modal
    const bulkAddButton = page.getByRole("button", { name: "Bulk Add" });
    await bulkAddButton.click();

    // Input CSV data
    const textarea = page.getByRole("textbox", {
      name: /CSV Input/i,
    });
    await textarea.fill("user,john_doe\ndomain,example.com");

    // Click Register
    const registerButton = page.getByRole("button", {
      name: /Register \(2 rules\)/,
    });
    await registerButton.click();

    // Verify backend call
    await expect.poll(() => addItemBlockRulesSpy).toHaveBeenCalledTimes(1);
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
    await expect
      .element(page.getByText("Successfully registered rules!"))
      .toBeInTheDocument();
    const doneButton = page.getByRole("button", { name: "Done" });
    await doneButton.click();

    // Verify modal is closed
    await expect
      .element(page.getByText("Bulk Add Block Rules"))
      .not.toBeInTheDocument();
  });
});

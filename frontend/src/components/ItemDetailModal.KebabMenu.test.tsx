import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient } from "../lib/query";
import { ToastProvider } from "../lib/toast";
import { worker } from "../mocks/browser";
import {
  AddItemBlockRulesResponseSchema,
  create,
  GetItemResponseSchema,
  ItemSchema,
  ListURLParsingRulesResponseSchema,
  toJson,
  URLParsingRuleSchema,
} from "../test-utils/json-identity";
import { ItemDetailModal } from "./ItemDetailModal";

describe("ItemDetailModal KebabMenu", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = (
    itemId: string,
    url = "https://example.com/article",
  ) => {
    worker.use(
      http.all("*/api/v2/items/:id", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: itemId,
            title: "Test Item",
            url: url,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
      http.all("*/api/v2/url-rules", () => {
        const msg = create(ListURLParsingRulesResponseSchema, {
          rules: [
            create(URLParsingRuleSchema, {
              id: "rule1",
              domain: "example.com",
              ruleType: "subdomain",
              pattern: "example.com",
            }),
          ],
        });
        return HttpResponse.json(
          toJson(ListURLParsingRulesResponseSchema, msg),
        );
      }),
    );
  };

  const setupMutationMock = () => {
    const addItemBlockRulesMock = vi.fn();
    worker.use(
      http.all("*/api/v2/block-rules", async ({ request }) => {
        const body = await request.json();
        addItemBlockRulesMock(body);
        const msg = create(AddItemBlockRulesResponseSchema, {});
        return HttpResponse.json(toJson(AddItemBlockRulesResponseSchema, msg));
      }),
    );
    return addItemBlockRulesMock;
  };

  const Wrapper = (props: { children: JSX.Element }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{props.children}</ToastProvider>
    </QueryClientProvider>
  );

  it("renders the kebab menu in the header", async () => {
    setupMockData("1");

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="1" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    // Wait for the item to load (title appears)
    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    // Check for the kebab menu button
    const kebabMenu = page.getByRole("button", { name: "More actions" });
    await expect.element(kebabMenu).toBeInTheDocument();
  });

  it("shows blocking options when URL matches a rule", async () => {
    // Set up item with a URL that matches the mock rule (user.example.com)
    setupMockData("2", "https://user1.example.com/post");

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="2" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    const kebabMenu = page.getByRole("button", { name: "More actions" });
    await kebabMenu.click();

    // Expect options to be present
    await expect
      .element(page.getByText("Block Domain (user1.example.com)"))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Block User (@example.com)"))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Block User (user1)"))
      .toBeInTheDocument();
  });

  it("calls AddItemBlockRules when an option is selected", async () => {
    setupMockData("3", "https://user1.example.com/post");
    const mutationMock = setupMutationMock();

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="3" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    const kebabMenu = page.getByRole("button", { name: "More actions" });
    await kebabMenu.click();

    const blockUserBtn = page.getByText("Block User (user1)");
    await blockUserBtn.click();

    // Verify mutation call
    await expect.poll(() => mutationMock).toHaveBeenCalled();
    const calls = mutationMock.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const requestBody = calls[0][0];
    expect(requestBody).toEqual({
      rules: [
        {
          ruleType: "user",
          value: "user1",
          domain: "example.com",
        },
      ],
    });

    // Verify success toast is rendered inside the native dialog top layer.
    await expect
      .poll(
        () =>
          document
            .querySelector('dialog [role="status"]')
            ?.textContent?.includes("Blocked user: user1") ?? false,
      )
      .toBe(true);
  });

  it("shows the blocked rule details in the success toast", async () => {
    setupMockData("4", "https://user1.example.com/post");
    setupMutationMock();

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="4" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    const kebabMenu = page.getByRole("button", { name: "More actions" });
    await kebabMenu.click();

    await page.getByText("Block User (user1)").click();

    await expect
      .poll(
        () =>
          document
            .querySelector('dialog [role="status"]')
            ?.textContent?.includes("Blocked user: user1") ?? false,
      )
      .toBe(true);
  });
});

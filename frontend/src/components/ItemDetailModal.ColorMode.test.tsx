import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { GetItemResponseSchema, ItemSchema } from "../gen/item/v1/item_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { ItemDetailModal } from "./ItemDetailModal";

describe("ItemDetailModal Color Mode Support", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = (content: string) => {
    worker.use(
      http.post("*/item.v1.ItemService/GetItem", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: "test-id",
            title: "Test Item",
            description: content,
            publishedAt: "2026-01-24T10:00:00Z",
            createdAt: "2026-01-24T09:00:00Z",
            author: "Test Author",
            url: "http://example.com",
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
    );
  };

  const Wrapper = (props: { children: JSX.Element }) => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </TransportProvider>
  );

  const content = `<div>
<p id="gh-light-mode-only">Light Mode Only Content</p>
<p id="gh-dark-mode-only">Dark Mode Only Content</p>
</div>`;

  it("renders both elements in the DOM", async () => {
    setupMockData(content);

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Light Mode Only Content")).toBeInTheDocument();
    await expect.element(page.getByText("Dark Mode Only Content")).toBeInTheDocument();

    const lightElement = document.getElementById("gh-light-mode-only");
    const darkElement = document.getElementById("gh-dark-mode-only");

    expect(lightElement).not.toBeNull();
    expect(darkElement).not.toBeNull();
  });

  it("verifies that CSS media queries are applied in the component styles", async () => {
    setupMockData(content);

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Light Mode Only Content")).toBeInTheDocument();

    // Check if any style tag or stylesheet contains the media queries we added
    const styleTags = Array.from(document.querySelectorAll("style"));
    let hasLightMediaQuery = styleTags.some(s => s.innerHTML.includes("prefers-color-scheme: light"));
    let hasDarkMediaQuery = styleTags.some(s => s.innerHTML.includes("prefers-color-scheme: dark"));
    let hasLightId = styleTags.some(s => s.innerHTML.includes("#gh-light-mode-only"));
    let hasDarkId = styleTags.some(s => s.innerHTML.includes("#gh-dark-mode-only"));

    if (!(hasLightMediaQuery && hasDarkMediaQuery && hasLightId && hasDarkId)) {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            const cssText = rule.cssText;
            if (cssText.includes("prefers-color-scheme: light")) hasLightMediaQuery = true;
            if (cssText.includes("prefers-color-scheme: dark")) hasDarkMediaQuery = true;
            if (cssText.includes("#gh-light-mode-only")) hasLightId = true;
            if (cssText.includes("#gh-dark-mode-only")) hasDarkId = true;
          }
        } catch (e) {
          // Ignore cross-origin stylesheet access errors
        }
      }
    }

    expect(hasLightMediaQuery).toBe(true);
    expect(hasDarkMediaQuery).toBe(true);
    expect(hasLightId).toBe(true);
    expect(hasDarkId).toBe(true);
  });
});

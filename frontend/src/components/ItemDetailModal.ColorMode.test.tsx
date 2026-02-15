import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  const content = `Test content with images:

[![](https://example.com/light.png)](https://example.com/image.png#gh-light-mode-only)
[![](https://example.com/dark.png)](https://example.com/image.png#gh-dark-mode-only)`;

  it("renders content with color mode links and images in the DOM", async () => {
    setupMockData(content);

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    // Wait for content to load
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify links exist with correct href patterns
    const lightLink = document.querySelector('a[href*="#gh-light-mode-only"]');
    const darkLink = document.querySelector('a[href*="#gh-dark-mode-only"]');

    expect(lightLink).not.toBeNull();
    expect(darkLink).not.toBeNull();

    // Verify images exist inside the links
    const lightImg = lightLink?.querySelector("img");
    const darkImg = darkLink?.querySelector("img");

    expect(lightImg).not.toBeNull();
    expect(darkImg).not.toBeNull();
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

    // Wait for content to load
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if any style tag or stylesheet contains the media queries we added
    const styleTags = Array.from(document.querySelectorAll("style"));
    let hasLightMediaQuery = styleTags.some((s) =>
      s.innerHTML.includes("prefers-color-scheme: light"),
    );
    let hasDarkMediaQuery = styleTags.some((s) =>
      s.innerHTML.includes("prefers-color-scheme: dark"),
    );
    let hasLightImgSelector = styleTags.some(
      (s) =>
        s.innerHTML.includes('href*="#gh-light-mode-only"') &&
        s.innerHTML.includes("img"),
    );
    let hasDarkImgSelector = styleTags.some(
      (s) =>
        s.innerHTML.includes('href*="#gh-dark-mode-only"') &&
        s.innerHTML.includes("img"),
    );

    if (
      !(
        hasLightMediaQuery &&
        hasDarkMediaQuery &&
        hasLightImgSelector &&
        hasDarkImgSelector
      )
    ) {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            const cssText = rule.cssText;
            if (cssText.includes("prefers-color-scheme: light"))
              hasLightMediaQuery = true;
            if (cssText.includes("prefers-color-scheme: dark"))
              hasDarkMediaQuery = true;
            if (
              cssText.includes("#gh-light-mode-only") &&
              cssText.includes("img")
            )
              hasLightImgSelector = true;
            if (
              cssText.includes("#gh-dark-mode-only") &&
              cssText.includes("img")
            )
              hasDarkImgSelector = true;
          }
        } catch (e) {
          // Ignore cross-origin stylesheet access errors
        }
      }
    }

    expect(hasLightMediaQuery).toBe(true);
    expect(hasDarkMediaQuery).toBe(true);
    expect(hasLightImgSelector).toBe(true);
    expect(hasDarkImgSelector).toBe(true);
  });
});

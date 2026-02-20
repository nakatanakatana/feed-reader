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

describe("ItemDetailModal Image Layout", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockDataWithContent = (itemId: string, content: string) => {
    worker.use(
      http.all("*/item.v1.ItemService/GetItem", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: itemId,
            title: "Test Item",
            content: content,
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

  it("applies flex layout to paragraphs with multiple images", async () => {
    // Markdown with two images in one paragraph
    const markdownContent = `![img1](https://example.com/img1.png) ![img2](https://example.com/img2.png)`;

    setupMockDataWithContent("test-images", markdownContent);

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-images" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    // Wait for content to render
    await expect.element(page.getByAltText("img1")).toBeInTheDocument();
    await expect.element(page.getByAltText("img2")).toBeInTheDocument();

    // Find the paragraph containing the images
    const p = page.getByRole("paragraph");

    await expect.element(p).toHaveStyle({ display: "flex" });
    await expect.element(p).toHaveStyle({ flexWrap: "wrap" });
    // Check that the expected 8px gap is applied
    await expect.element(p).toHaveStyle({ gap: "8px" });
  });

  it("applies flex layout to paragraphs with multiple linked images", async () => {
    // Markdown with two linked images in one paragraph
    const markdownContent = `[![img1](https://example.com/img1.png)](https://example.com/link1) [![img2](https://example.com/img2.png)](https://example.com/link2)`;

    setupMockDataWithContent("test-linked-images", markdownContent);

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-linked-images" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    // Wait for content to render
    await expect.element(page.getByAltText("img1")).toBeInTheDocument();
    await expect.element(page.getByAltText("img2")).toBeInTheDocument();

    // Find the paragraph containing the images
    const p = page.getByRole("paragraph");

    await expect.element(p).toHaveStyle({ display: "flex" });
    await expect.element(p).toHaveStyle({ flexWrap: "wrap" });
    await expect.element(p).toHaveStyle({ gap: "8px" });
  });

  it("applies flex layout to paragraphs with mixed images and linked images", async () => {
    // Markdown with an image and a linked image in one paragraph
    const markdownContent = `![img1](https://example.com/img1.png) [![img2](https://example.com/img2.png)](https://example.com/link2)`;

    setupMockDataWithContent("test-mixed-images", markdownContent);

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-mixed-images" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    // Wait for content to render
    await expect.element(page.getByAltText("img1")).toBeInTheDocument();
    await expect.element(page.getByAltText("img2")).toBeInTheDocument();

    // Find the paragraph containing the images
    const p = page.getByRole("paragraph");

    await expect.element(p).toHaveStyle({ display: "flex" });
    await expect.element(p).toHaveStyle({ flexWrap: "wrap" });
    await expect.element(p).toHaveStyle({ gap: "8px" });
  });

  it("initially hides images and shows them only after layout is determined", async () => {
    setupMockDataWithContent(
      "test-visibility",
      "![loading](https://example.com/loading.png)",
    );
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-visibility" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    const img = page.getByAltText("loading");
    await expect.element(img).toBeInTheDocument();

    // Initially should be transparent and have default maxHeight
    await expect.element(img).toHaveStyle({ opacity: "0" });
    await expect.element(img).toHaveStyle({ maxHeight: "10vh" });

    // Mock naturalWidth/Height and trigger load
    const imgEl = document.querySelector(
      'img[alt="loading"]',
    ) as HTMLImageElement;
    if (imgEl) {
      Object.defineProperty(imgEl, "naturalWidth", {
        value: 1200,
        configurable: true,
      });
      Object.defineProperty(imgEl, "naturalHeight", {
        value: 600,
        configurable: true,
      });
      imgEl.dispatchEvent(new Event("load"));
    }

    // Now should be visible and have hero maxHeight
    await expect.element(img).toHaveStyle({ opacity: "1" });
    await expect.element(img).toHaveStyle({ maxHeight: "30vh" });
  });

  describe("Image height limits", () => {
    it("applies 30vh max-height to hero images (landscape)", async () => {
      setupMockDataWithContent(
        "test-hero",
        "![hero](https://example.com/hero.png)",
      );
      dispose = render(
        () => (
          <Wrapper>
            <ItemDetailModal itemId="test-hero" onClose={() => {}} />
          </Wrapper>
        ),
        document.body,
      );

      await expect.element(page.getByAltText("hero")).toBeInTheDocument();

      // Trigger layout detection
      const img = document.querySelector('img[alt="hero"]') as HTMLImageElement;
      if (img) {
        Object.defineProperty(img, "naturalWidth", {
          value: 1200,
          configurable: true,
        });
        Object.defineProperty(img, "naturalHeight", {
          value: 600,
          configurable: true,
        });
        img.dispatchEvent(new Event("load"));
      }

      await expect
        .element(page.getByAltText("hero"))
        .toHaveStyle({ maxHeight: "30vh" });
    });

    it("applies 5vh max-height to icon images (square)", async () => {
      setupMockDataWithContent(
        "test-icon",
        "![icon](https://example.com/icon.png)",
      );
      dispose = render(
        () => (
          <Wrapper>
            <ItemDetailModal itemId="test-icon" onClose={() => {}} />
          </Wrapper>
        ),
        document.body,
      );

      await expect.element(page.getByAltText("icon")).toBeInTheDocument();

      const img = document.querySelector('img[alt="icon"]') as HTMLImageElement;
      if (img) {
        Object.defineProperty(img, "naturalWidth", {
          value: 32,
          configurable: true,
        });
        Object.defineProperty(img, "naturalHeight", {
          value: 32,
          configurable: true,
        });
        img.dispatchEvent(new Event("load"));
      }

      await expect
        .element(page.getByAltText("icon"))
        .toHaveStyle({ maxHeight: "5vh" });
    });

    it("applies 10vh max-height to other images (portrait)", async () => {
      setupMockDataWithContent(
        "test-other",
        "![other](https://example.com/other.png)",
      );
      dispose = render(
        () => (
          <Wrapper>
            <ItemDetailModal itemId="test-other" onClose={() => {}} />
          </Wrapper>
        ),
        document.body,
      );

      await expect.element(page.getByAltText("other")).toBeInTheDocument();

      const img = document.querySelector(
        'img[alt="other"]',
      ) as HTMLImageElement;
      if (img) {
        Object.defineProperty(img, "naturalWidth", {
          value: 600,
          configurable: true,
        });
        Object.defineProperty(img, "naturalHeight", {
          value: 1200,
          configurable: true,
        });
        img.dispatchEvent(new Event("load"));
      }

      await expect
        .element(page.getByAltText("other"))
        .toHaveStyle({ maxHeight: "10vh" });
    });
  });

  it("does NOT apply flex layout to paragraphs with a single image", async () => {
    const markdownContent = `![img1](https://example.com/img1.png)`;

    setupMockDataWithContent("test-single-image", markdownContent);

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-single-image" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByAltText("img1")).toBeInTheDocument();
    const p = page.getByRole("paragraph");

    await expect.element(p).toHaveStyle({ display: "block" });
  });

  it("does NOT apply flex layout to text-only paragraphs", async () => {
    const markdownContent = `Just some plain text content.`;

    setupMockDataWithContent("test-text-only", markdownContent);

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-text-only" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect
      .element(page.getByText("Just some plain text content."))
      .toBeInTheDocument();
    const p = page.getByRole("paragraph");

    await expect.element(p).toHaveStyle({ display: "block" });
  });
});

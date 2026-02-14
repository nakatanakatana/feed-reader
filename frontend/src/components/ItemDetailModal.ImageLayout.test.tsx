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
      http.post("*/item.v1.ItemService/GetItem", () => {
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

    // This is expected to fail initially as we haven't implemented flex layout yet
    await expect.element(p).toHaveStyle({ display: "flex" });
    await expect.element(p).toHaveStyle({ flexWrap: "wrap" });
    // Check for gap (using 8px as an example, we'll decide on exact value later)
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

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

describe("ItemDetailModal Reproduction", () => {
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

  it("checks if anchor tag around image is block-level or full width", async () => {
    // Markdown with a linked image using data URI to ensure it renders with dimensions
    // 200x100 PNG
    const base64Img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAYAAADDhn8LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAC0SURBVHhe7dOxAQAgDMCw/v9nPEX2UKR1wDvYvTnmXw4wI8mQZEgyJBmSDEmGJEOSIcmQZEgyJBmSDEmGJEOSIcmQZEgyJBmSDEmGJEOSIcmQZEgyJBmSDEmGJEOSIcmQZEgyJBmSDEmGJEOSIcmQZEgyJBmSDEmGJEOSIcmQZEgyJBmSDEmGJEOSIcmQZEgyJBmSDEmGJEOSIcmQZEgyJBmSDEmGJEOSIQO3zQCy2xcG/gAAAABJRU5ErkJggg==";
    const markdownContent = `[![img1](${base64Img})](https://example.com/link1)`;

    setupMockDataWithContent("test-repro", markdownContent);

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-repro" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    // Wait for content to render
    await expect.element(page.getByAltText("img1")).toBeInTheDocument();

    const img = document.querySelector('img[alt="img1"]') as HTMLImageElement;
    expect(img).not.toBeNull();
    
    // Wait for image to load
    if (!img.complete) {
        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve; // Continue even if error
        });
    }

    // Small delay for layout
    await new Promise(r => setTimeout(r, 100));

    const anchor = img.closest("a");
    expect(anchor).not.toBeNull();

    if (anchor && img) {
        const imgRect = img.getBoundingClientRect();
        const anchorRect = anchor.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(anchor);
        const parentRect = anchor.parentElement?.getBoundingClientRect();

        console.log("Image Width:", imgRect.width);
        console.log("Anchor Width:", anchorRect.width);
        console.log("Parent Width:", parentRect?.width);
        console.log("Anchor Display:", computedStyle.display);
        console.log("Image Display:", window.getComputedStyle(img).display);

        // Reproduction: The anchor width should roughly equal image width.
        // If the bug exists (full width click area), anchorWidth will be much larger than imgWidth (and close to ParentWidth)
        expect(anchorRect.width).toBeCloseTo(imgRect.width, 1);
    }
  });
});

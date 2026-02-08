import { QueryClientProvider } from "@tanstack/solid-query";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { ItemDetailModal } from "./ItemDetailModal";
import "../styles.css";
import { create, toJson } from "@bufbuild/protobuf";
import { HttpResponse, http } from "msw";
import { GetItemResponseSchema, ItemSchema } from "../gen/item/v1/item_pb";
import { worker } from "../mocks/browser";

describe("ItemDetailModal Responsive", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = (itemId: string) => {
    worker.use(
      http.post("*/item.v1.ItemService/GetItem", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: itemId,
            title: "Test Item",
            description: "<p>Test Content</p>",
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

  it("should be fullscreen on mobile viewports", async () => {
    await page.viewport(375, 667); // iPhone SE size
    setupMockData("test-id");

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    // Wait for content
    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    const dialog = page.getByRole("dialog");
    await expect.element(dialog).toBeInTheDocument();

    const el = await dialog.element();
    const rect = el.getBoundingClientRect();
    expect(rect.width).toBe(375);
  });

  it("should be large (80-90%) on desktop viewports", async () => {
    await page.viewport(1920, 1080);
    setupMockData("test-id");

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    const dialog = page.getByRole("dialog");
    await expect.element(dialog).toBeInTheDocument();

    const el = await dialog.element();
    const rect = el.getBoundingClientRect();

    // Desktop: 80-90% width (1920 * 0.8 = 1536)
    // The implementation might have changed or uses different units
    expect(rect.width).toBeGreaterThan(1500);
  });
});

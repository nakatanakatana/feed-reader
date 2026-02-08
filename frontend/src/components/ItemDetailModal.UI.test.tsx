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

describe("ItemDetailModal UI Updates", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = (itemId: string, itemData: Partial<ItemSchema>) => {
    worker.use(
      http.post("*/item.v1.ItemService/GetItem", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: itemId,
            ...itemData,
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

  it("renders title as a link and displays content, image, and categories", async () => {
    setupMockData("1", {
      title: "Link Title",
      url: "https://example.com/item1",
      description: "Content",
      imageUrl: "https://example.com/image.jpg",
      categories: '["Tech", "News"]',
    });

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="1" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    const titleLink = page.getByRole("link", { name: "Link Title" });
    await expect.element(titleLink).toBeInTheDocument();
    await expect
      .element(titleLink)
      .toHaveAttribute("href", "https://example.com/item1");

    await expect.element(page.getByText("Content")).toBeInTheDocument();

    // Use poll with querySelector to wait for image to appear
    await expect
      .poll(() =>
        document.querySelector('img[src="https://example.com/image.jpg"]'),
      )
      .not.toBeNull();

    const image = document.querySelector(
      'img[src="https://example.com/image.jpg"]',
    ) as HTMLImageElement;
    expect(image.getAttribute("src")).toBe("https://example.com/image.jpg");

    await expect.element(page.getByText("Tech")).toBeInTheDocument();
    await expect.element(page.getByText("News")).toBeInTheDocument();

    expect(document.body.innerHTML).toMatchSnapshot();
  });

  it("renders comma-separated categories when JSON format is absent", async () => {
    setupMockData("2", {
      title: "Item 2",
      categories: "Science, Space",
    });

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="2" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Science")).toBeInTheDocument();
    await expect.element(page.getByText("Space")).toBeInTheDocument();

    expect(document.body.innerHTML).toMatchSnapshot();
  });

  it("falls back to CSV parsing when JSON is malformed", async () => {
    setupMockData("3", {
      title: "Item 3",
      categories: "[Malformed, JSON",
    });

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="3" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Malformed")).toBeInTheDocument();
    await expect.element(page.getByText("JSON")).toBeInTheDocument();

    expect(document.body.innerHTML).toMatchSnapshot();
  });
});

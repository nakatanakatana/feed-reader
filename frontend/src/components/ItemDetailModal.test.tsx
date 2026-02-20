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

describe("ItemDetailModal", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = (itemId: string) => {
    worker.use(
      http.all("*/item.v1.ItemService/GetItem", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: itemId,
            title: "Test Item",
            description: "Test Content",
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

  it("renders item content when itemId is provided", async () => {
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
    await expect
      .element(page.getByText(/Published:/).first())
      .toBeInTheDocument();
    await expect
      .element(page.getByText(/Received:/).first())
      .toBeInTheDocument();
    await expect.element(page.getByText("By Test Author")).toBeInTheDocument();
    await expect.element(page.getByText("Test Content")).toBeInTheDocument();

    // Check for title link
    const titleLink = page.getByRole("link", { name: "Test Item" });
    await expect.element(titleLink).toBeInTheDocument();
    await expect
      .element(titleLink)
      .toHaveAttribute("href", "http://example.com");

    expect(document.body.innerHTML).toMatchSnapshot();
  });

  it("does NOT render a close button (✕)", async () => {
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
    const closeButton = page.getByText("✕");
    await expect.element(closeButton).not.toBeInTheDocument();
  });

  it("does not render when itemId is undefined", async () => {
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId={undefined} onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );
    const modalContent = document.body.innerHTML;
    expect(modalContent).toBe("");
  });
});

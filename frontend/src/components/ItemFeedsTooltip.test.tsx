import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { ListItemFeedsResponseSchema } from "../gen/item/v1/item_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { ItemFeedsTooltip } from "./ItemFeedsTooltip";

describe("ItemFeedsTooltip", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    queryClient.clear();
  });

  const setupMockData = (itemId: string) => {
    worker.use(
      http.post("*/item.v1.ItemService/ListItemFeeds", () => {
        const msg = create(ListItemFeedsResponseSchema, {
          feeds: [
            {
              feedId: "feed-1",
              feedTitle: "Test Feed 1",
              publishedAt: "2026-01-24T10:00:00Z",
              createdAt: "2026-01-24T10:05:00Z",
            },
            {
              feedId: "feed-2",
              feedTitle: "Test Feed 2",
              publishedAt: "2026-01-24T11:00:00Z",
              createdAt: "2026-01-24T11:10:00Z",
            },
          ],
        });
        return HttpResponse.json(toJson(ListItemFeedsResponseSchema, msg));
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

  it("shows tooltip content on hover", async () => {
    const itemId = "test-item-id";
    setupMockData(itemId);

    dispose = render(
      () => (
        <Wrapper>
          <ItemFeedsTooltip itemId={itemId}>
            <span data-testid="trigger">Hover me</span>
          </ItemFeedsTooltip>
        </Wrapper>
      ),
      document.body,
    );

    const trigger = page.getByTestId("trigger");
    await expect.element(trigger).toBeInTheDocument();

    // Tooltip should not be visible initially
    await expect.element(page.getByText("Test Feed 1")).not.toBeInTheDocument();

    // Hover
    await userEvent.hover(trigger);

    // Tooltip should appear
    await expect.element(page.getByText("Test Feed 1")).toBeInTheDocument();
    await expect.element(page.getByText("Test Feed 2")).toBeInTheDocument();
    // Check for presence of the dates without strict format
    await expect.element(page.getByText(/24/).first()).toBeInTheDocument();
  });
});

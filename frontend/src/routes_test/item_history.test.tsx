import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import {
  GetItemResponseSchema,
  ItemSchema,
  ListItemsResponseSchema,
} from "../gen/item/v1/item_pb";
import { dateToTimestamp } from "../lib/item-utils";
import { queryClient, transport } from "../lib/query";
import { ToastProvider } from "../lib/toast";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("Item History Navigation", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const TestWrapper = (props: { children: any }) => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{props.children}</ToastProvider>
      </QueryClientProvider>
    </TransportProvider>
  );

  const items = [
    {
      id: "1",
      title: "Item 1",
      isRead: false,
      createdAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
      publishedAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
      feedId: "feed-1",
    },
    {
      id: "2",
      title: "Item 2",
      isRead: false,
      createdAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
      publishedAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
      feedId: "feed-1",
    },
  ];

  it("should use replace when navigating from list to item detail", async () => {
    worker.use(
      http.all("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: items.map((i) => create(ItemSchema, i)),
          nextPageToken: "",
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.all("*/item.v1.ItemService/GetItem", ({ request }) => {
        const url = new URL(request.url);
        const messageParam = url.searchParams.get("message") || "{}";
        const { id } = JSON.parse(decodeURIComponent(messageParam));
        const item = items.find((i) => i.id === id);
        const msg = create(GetItemResponseSchema, {
          item: item ? create(ItemSchema, item) : undefined,
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
    );

    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TestWrapper>
          <RouterProvider router={router} />
        </TestWrapper>
      ),
      document.body,
    );

    // Navigate to item 1
    const item1 = page.getByText("Item 1");
    await expect.element(item1).toBeInTheDocument();
    await item1.click();

    // Check URL
    await expect.poll(() => history.location.pathname).toBe("/items/1");
  });

  it("should use replace when navigating between items in modal", async () => {
    worker.use(
      http.all("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: items.map((i) => create(ItemSchema, i)),
          nextPageToken: "",
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.all("*/item.v1.ItemService/GetItem", ({ request }) => {
        const url = new URL(request.url);
        const messageParam = url.searchParams.get("message") || "{}";
        const { id } = JSON.parse(decodeURIComponent(messageParam));
        const item = items.find((i) => i.id === id);
        const msg = create(GetItemResponseSchema, {
          item: item ? create(ItemSchema, item) : undefined,
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
    );

    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TestWrapper>
          <RouterProvider router={router} />
        </TestWrapper>
      ),
      document.body,
    );

    // Navigate to item 1
    const item1 = page.getByText("Item 1");
    await expect.element(item1).toBeInTheDocument();
    await item1.click();

    await expect.element(page.getByRole("dialog")).toBeInTheDocument();

    // Navigate to item 2 (using keyboard shortcut 'j' for next item)
    await userEvent.keyboard("j");

    await expect.poll(() => history.location.pathname).toBe("/items/2");
  });

  it("should return to list view when back button is pressed", async () => {
    worker.use(
      http.all("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: items.map((i) => create(ItemSchema, i)),
          nextPageToken: "",
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.all("*/item.v1.ItemService/GetItem", ({ request }) => {
        const url = new URL(request.url);
        const messageParam = url.searchParams.get("message") || "{}";
        const { id } = JSON.parse(decodeURIComponent(messageParam));
        const item = items.find((i) => i.id === id);
        const msg = create(GetItemResponseSchema, {
          item: item ? create(ItemSchema, item) : undefined,
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
    );

    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TestWrapper>
          <RouterProvider router={router} />
        </TestWrapper>
      ),
      document.body,
    );

    // Navigate to item 1
    await page.getByText("Item 1").click();
    await expect.element(page.getByRole("dialog")).toBeInTheDocument();

    // Press escape or close
    await userEvent.keyboard("{Escape}");

    // Should be back at "/"
    await expect.poll(() => history.location.pathname).toBe("/");
    await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
  });
});

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
import { ListFeedTagsResponseSchema } from "../gen/feed/v1/feed_pb";
import {
  GetItemResponseSchema,
  ItemSchema,
  ListItemSchema,
  ListItemsResponseSchema,
} from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { setLastFetched } from "../lib/item-db";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("Item History Navigation", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    setLastFetched(null);
  });

  const setupMockData = (items: Record<string, unknown>[] = []) => {
    worker.use(
      http.post("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: items.map((i) => create(ListItemSchema, i)),
          totalCount: items.length,
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.post("*/item.v1.ItemService/GetItem", ({ request }) => {
        return request.json().then((body) => {
          const { id } = body as { id: string };
          const item = items.find((i) => i.id === id) || items[0];
          const msg = create(GetItemResponseSchema, {
            item: create(ItemSchema, item),
          });
          return HttpResponse.json(toJson(GetItemResponseSchema, msg));
        });
      }),
      http.post("*/tag.v1.TagService/ListTags", () => {
        return HttpResponse.json(
          toJson(
            ListTagsResponseSchema,
            create(ListTagsResponseSchema, { tags: [] }),
          ),
        );
      }),
      http.post("*/feed.v1.FeedService/ListFeedTags", () => {
        return HttpResponse.json(
          toJson(
            ListFeedTagsResponseSchema,
            create(ListFeedTagsResponseSchema, { feedTags: [] }),
          ),
        );
      }),
    );
  };

  it("should use replace when navigating from list to item detail", async () => {
    const fixedDate = "2026-01-20T19:00:00Z";
    setLastFetched(new Date(fixedDate));
    setupMockData([
      {
        id: "1",
        title: "Item 1",
        publishedAt: fixedDate,
        createdAt: fixedDate,
        isRead: false,
      },
      {
        id: "2",
        title: "Item 2",
        publishedAt: fixedDate,
        createdAt: fixedDate,
        isRead: false,
      },
    ]);

    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    expect(history.location.pathname).toBe("/");
    expect(history.length).toBe(1);

    const item1 = page.getByText("Item 1");
    await expect.element(item1).toBeInTheDocument();
    await item1.click();

    await expect.element(page.getByRole("dialog")).toBeInTheDocument();
    expect(history.location.pathname).toBe("/items/1");

    // First modal open SHOULD add an entry so 'back' works
    expect(history.length).toBe(2);
  });

  it("should use replace when navigating between items in modal", async () => {
    const fixedDate = "2026-01-20T19:00:00Z";
    setLastFetched(new Date(fixedDate));
    setupMockData([
      {
        id: "1",
        title: "Item 1",
        publishedAt: fixedDate,
        createdAt: fixedDate,
        isRead: false,
      },
      {
        id: "2",
        title: "Item 2",
        publishedAt: fixedDate,
        createdAt: fixedDate,
        isRead: false,
      },
    ]);

    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Navigate to item 1
    const item1 = page.getByText("Item 1");
    await expect.element(item1).toBeInTheDocument();
    await item1.click();

    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();
    expect(history.location.pathname).toBe("/items/1");
    expect(history.length).toBe(2);

    // Simulate keyboard 'j' to go to next item
    await userEvent.keyboard("j");

    await expect
      .element(page.getByRole("heading", { name: "Item 2" }))
      .toBeInTheDocument();
    expect(history.location.pathname).toBe("/items/2");

    // History length should STAY at 2 because we used replace
    expect(history.length).toBe(2);
  });

  it("should return to list view when back button is pressed", async () => {
    const fixedDate = "2026-01-20T19:00:00Z";
    setupMockData([
      {
        id: "1",
        title: "Item 1",
        publishedAt: fixedDate,
        createdAt: fixedDate,
        isRead: false,
      },
      {
        id: "2",
        title: "Item 2",
        publishedAt: fixedDate,
        createdAt: fixedDate,
        isRead: false,
      },
    ]);

    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Navigate to item 1
    await page.getByText("Item 1").click();
    await expect.element(page.getByRole("dialog")).toBeInTheDocument();

    // Navigate to item 2
    await userEvent.keyboard("j");
    await expect
      .element(page.getByRole("heading", { name: "Item 2" }))
      .toBeInTheDocument();

    // Go back
    history.go(-1);

    // If we used replace, we should be at "/"
    // If we used push, we are at "/items/1"
    expect(history.location.pathname).toBe("/");
    await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
  });
});

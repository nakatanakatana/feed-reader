import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { dateToTimestamp } from "../lib/item-utils";
import { queryClient } from "../lib/query";
import { ToastProvider } from "../lib/toast";
import { worker } from "../mocks/browser";
import { parseRequestMessage } from "../mocks/http";
import { routeTree } from "../routeTree.gen";
import {
  create,
  GetItemResponseSchema,
  ItemSchema,
  ListItemsResponseSchema,
  toJson,
} from "../test-utils/json-identity";

describe("Item History Navigation", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const TestWrapper = (props: { children: JSX.Element }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{props.children}</ToastProvider>
    </QueryClientProvider>
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
      http.all("*/api/v2/items", () => {
        const msg = create(ListItemsResponseSchema, {
          items: items.map((i) => create(ItemSchema, i)),
          nextPageToken: "",
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.all("*/api/v2/items/:id", async ({ request }) => {
        const { id } = (await parseRequestMessage(request)) as { id: string };
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
      http.all("*/api/v2/items", () => {
        const msg = create(ListItemsResponseSchema, {
          items: items.map((i) => create(ItemSchema, i)),
          nextPageToken: "",
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.all("*/api/v2/items/:id", async ({ request }) => {
        const { id } = (await parseRequestMessage(request)) as { id: string };
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
      http.all("*/api/v2/items", () => {
        const msg = create(ListItemsResponseSchema, {
          items: items.map((i) => create(ItemSchema, i)),
          nextPageToken: "",
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.all("*/api/v2/items/:id", async ({ request }) => {
        const { id } = (await parseRequestMessage(request)) as { id: string };
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

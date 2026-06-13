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
import { queryClient } from "../lib/query";
import { ToastProvider } from "../lib/toast";
import { worker } from "../mocks/browser";
import { parseRequestMessage } from "../mocks/http";
import { routeTree } from "../routeTree.gen";
import {
  create,
  GetItemResponseSchema,
  ItemSchema,
  ListFeedTagsResponseSchema,
  ListItemsResponseSchema,
  ListTagsResponseSchema,
  toJson,
  UpdateItemStatusResponseSchema,
} from "../test-utils/json-identity";

describe("ItemDetailRouteView Auto-Read", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = () => {
    worker.use(
      http.all("*/api/v2/items", () => {
        const msg = create(ListItemsResponseSchema, {
          items: [
            create(ItemSchema, { id: "1", title: "Item 1", isRead: false }),
            create(ItemSchema, { id: "2", title: "Item 2", isRead: false }),
          ],
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
      }),
      http.all("*/api/v2/items/:id", async ({ request }) => {
        const body = (await parseRequestMessage(request)) as { id: string };
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: body.id,
            title: `Item ${body.id}`,
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
      http.all("*/api/v2/tags", () => {
        return HttpResponse.json(
          toJson(
            ListTagsResponseSchema,
            create(ListTagsResponseSchema, { tags: [] }),
          ),
        );
      }),
      http.all("*/api/v2/feed-tags", () => {
        return HttpResponse.json(
          toJson(
            ListFeedTagsResponseSchema,
            create(ListFeedTagsResponseSchema, { feedTags: [] }),
          ),
        );
      }),
    );
  };

  it("marks current item as read when navigating to next", async () => {
    setupMockData();
    let updateCalledForId = "";
    worker.use(
      http.post("*/api/v2/items/status", async ({ request }) => {
        const body = (await request.json()) as {
          ids: string[];
          isRead: boolean;
        };
        if (body.isRead === true) {
          updateCalledForId = body.ids[0];
        }
        return HttpResponse.json(
          toJson(
            UpdateItemStatusResponseSchema,
            create(UpdateItemStatusResponseSchema, {}),
          ),
        );
      }),
    );

    const history = createMemoryHistory({ initialEntries: ["/items/1"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </QueryClientProvider>
      ),
      document.body,
    );

    // Wait for content
    await expect
      .element(page.getByRole("heading", { name: "Item 1" }))
      .toBeInTheDocument();

    await userEvent.keyboard("j");

    await expect.poll(() => updateCalledForId).toBe("1");
  });

  it("marks current item as read when navigating to prev", async () => {
    setupMockData();
    let updateCalledForId = "";
    worker.use(
      http.post("*/api/v2/items/status", async ({ request }) => {
        const body = (await request.json()) as {
          ids: string[];
          isRead: boolean;
        };
        if (body.isRead === true) {
          updateCalledForId = body.ids[0];
        }
        return HttpResponse.json(
          toJson(
            UpdateItemStatusResponseSchema,
            create(UpdateItemStatusResponseSchema, {}),
          ),
        );
      }),
    );

    const history = createMemoryHistory({ initialEntries: ["/items/2"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </QueryClientProvider>
      ),
      document.body,
    );

    await expect
      .element(page.getByRole("heading", { name: "Item 2" }))
      .toBeInTheDocument();

    await userEvent.keyboard("k");

    await expect.poll(() => updateCalledForId).toBe("2");
  });
});

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
import { page } from "vitest/browser";
import { ListFeedTagsResponseSchema } from "../gen/feed/v1/feed_pb";
import { ListItemsResponseSchema } from "../gen/item/v1/item_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("ItemList Date Filter", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = () => {
    worker.use(
      http.post("*/item.v1.ItemService/ListItems", () => {
        const msg = create(ListItemsResponseSchema, {
          items: [],
          totalCount: 0,
        });
        return HttpResponse.json(toJson(ListItemsResponseSchema, msg));
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

  it("renders the date filter selector", async () => {
    setupMockData();
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

    const dateFilter = page.getByText(/Date:/i);
    await expect.element(dateFilter).toBeInTheDocument();
  });

  it("updates URL search params when date filter is changed", async () => {
    setupMockData();
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

    const select = page.getByRole("combobox");
    await select.selectOptions("30d");

    // Check if URL is updated
    await expect.poll(() => history.location.search).toEqual("?since=30d");
  });
});

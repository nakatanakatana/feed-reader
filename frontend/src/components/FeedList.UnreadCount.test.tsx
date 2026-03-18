import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import { FeedSchema, ListFeedsResponseSchema } from "../gen/feed/v1/feed_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";

describe("FeedList Unread Counts", () => {
  let dispose: () => void;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(async () => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const TestWrapper = (props: { children: JSX.Element }) => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
    </TransportProvider>
  );

  it("displays unread count for each feed", async () => {
    worker.use(
      http.all("*/feed.v1.FeedService/ListFeeds", () => {
        const msg = create(ListFeedsResponseSchema, {
          feeds: [
            create(FeedSchema, {
              id: "1",
              title: "Feed 1",
              url: "http://example.com/1",
              unreadCount: 5n,
            }),
            create(FeedSchema, {
              id: "2",
              title: "Feed 2",
              url: "http://example.com/2",
              unreadCount: 0n,
            }),
            create(FeedSchema, {
              id: "3",
              title: "Feed 3",
              url: "http://example.com/3",
              unreadCount: 10n,
            }),
          ],
        });
        return HttpResponse.json(toJson(ListFeedsResponseSchema, msg));
      }),
    );

    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TestWrapper>
          <RouterProvider router={router} />
        </TestWrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Feed 1")).toBeInTheDocument();
  });
});

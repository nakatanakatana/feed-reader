import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import { type JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { FeedService } from "../gen/feed/v1/feed_connect";
import { DeleteFeedResponse, ListFeedsResponse } from "../gen/feed/v1/feed_pb";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { mockConnectWeb } from "../mocks/connect";
import { routeTree } from "../routeTree.gen";

describe("FeedList", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  const transport = createConnectTransport({
    baseUrl: "http://localhost:3000",
  });

  const _renderWithProviders = (_ui: () => JSX.Element) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const history = createMemoryHistory({
      initialEntries: ["/feeds"],
    });

    const router = createRouter({
      routeTree,
      history,
    });

    return render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );
  };

  it("displays a list of feeds", async () => {
    worker.use(
      mockConnectWeb(FeedService)({
        method: "listFeeds",
        handler: () => {
          return new ListFeedsResponse({
            feeds: [
              { uuid: "1", title: "Feed 1", url: "http://example.com/1" },
              { uuid: "2", title: "Feed 2", url: "http://example.com/2" },
            ],
          });
        },
      }),
    );

    // Instead of rendering component directly, we need to let router render it via /feeds route
    // But for unit test simplicity, we might just want to wrap it in RouterProvider even if it's not the intended route.
    // TanStack Router might complain if we render the component directly outside of a route match.
    // Let's try wrapping it.
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
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

    await expect.element(page.getByText("Feed 1")).toBeInTheDocument();
    await expect.element(page.getByText("Feed 2")).toBeInTheDocument();

    const link1 = page.getByRole("link", { name: "Feed 1" });
    expect(link1).toHaveAttribute("href", "/feeds/1");
  });

  it("deletes a feed", async () => {
    const deleteFeedMock = vi.fn();
    worker.use(
      mockConnectWeb(FeedService)({
        method: "listFeeds",
        handler: () => {
          return new ListFeedsResponse({
            feeds: [
              { uuid: "1", title: "Feed 1", url: "http://example.com/1" },
            ],
          });
        },
      }),
      mockConnectWeb(FeedService)({
        method: "deleteFeed",
        handler: (req) => {
          deleteFeedMock(req);
          return new DeleteFeedResponse({});
        },
      }),
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
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

    await expect.element(page.getByText("Feed 1")).toBeInTheDocument();

    const deleteButton = page.getByText("Delete");
    await deleteButton.click();

    await expect
      .poll(() => deleteFeedMock.mock.calls.length)
      .toBeGreaterThan(0);
    expect(deleteFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({ uuid: "1" }),
    );
  });

  it("displays an error message when listFeeds fails", async () => {
    worker.use(
      http.post("*/feed.v1.FeedService/ListFeeds", () => {
        return new HttpResponse(
          JSON.stringify({ message: "Failed to fetch feeds", code: 13 }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
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

    await expect
      .element(page.getByText(/Error: .*Failed to fetch feeds.*/))
      .toBeInTheDocument();
  });

  it("displays an error message when deleteFeed fails", async () => {
    worker.use(
      http.post("*/feed.v1.FeedService/ListFeeds", () => {
        return HttpResponse.json({
          feeds: [{ uuid: "1", title: "Feed 1", url: "http://example.com/1" }],
        });
      }),
      http.post("*/feed.v1.FeedService/DeleteFeed", () => {
        return new HttpResponse(
          JSON.stringify({ message: "Failed to delete feed", code: 7 }),
          {
            status: 403, // PermissionDenied -> 403
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
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

    await expect.element(page.getByText("Feed 1")).toBeInTheDocument();

    const deleteButton = page.getByText("Delete");
    await deleteButton.click();

    await expect
      .element(page.getByText(/Delete Error: .*Failed to delete feed.*/))
      .toBeInTheDocument();
  });
});

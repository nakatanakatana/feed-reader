import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { FeedList } from "./FeedList";
import { mockConnectWeb } from "../mocks/connect";
import { FeedService } from "../gen/feed/v1/feed_connect";
import { DeleteFeedResponse, ListFeedsResponse } from "../gen/feed/v1/feed_pb";

describe("FeedList", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  const transport = createConnectTransport({
    baseUrl: "http://localhost:3000",
  });

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

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <FeedList />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    await expect.element(page.getByText("Feed 1")).toBeInTheDocument();
    await expect.element(page.getByText("Feed 2")).toBeInTheDocument();
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

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <FeedList />
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

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <FeedList />
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

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <FeedList />
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

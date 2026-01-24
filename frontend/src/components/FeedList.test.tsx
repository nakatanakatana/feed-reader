import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { FeedService } from "../gen/feed/v1/feed_connect";
import { DeleteFeedResponse, ListFeedsResponse } from "../gen/feed/v1/feed_pb";
import { worker } from "../mocks/browser";
import { mockConnectWeb } from "../mocks/connect";
import { routeTree } from "../routeTree.gen";
import { queryClient } from "../lib/query";

describe("FeedList", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    queryClient.clear();
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    const history = createMemoryHistory({
      initialEntries: ["/feeds"],
    });

    const router = createRouter({
      routeTree,
      history,
    });

    return render(() => <RouterProvider router={router} />, document.body);
  };

  it("displays a list of feeds", async () => {
    worker.use(
      mockConnectWeb(FeedService)({
        method: "listFeeds",
        handler: () => {
          return new ListFeedsResponse({
            feeds: [
              {
                uuid: "1",
                title: "Feed 1",
                url: "http://example.com/1",
                createdAt: "",
                updatedAt: "",
              },
              {
                uuid: "2",
                title: "Feed 2",
                url: "http://example.com/2",
                createdAt: "",
                updatedAt: "",
              },
            ],
          });
        },
      }),
    );

    dispose = renderComponent();

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
              {
                uuid: "1",
                title: "Feed 1",
                url: "http://example.com/1",
                createdAt: "",
                updatedAt: "",
              },
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

    dispose = renderComponent();

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

    dispose = renderComponent();

    await expect
      .element(page.getByText(/Error: .*Failed to fetch feeds.*/))
      .toBeInTheDocument();
  });
});

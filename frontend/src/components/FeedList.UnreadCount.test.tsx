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
import { page } from "vitest/browser";
import { queryClient } from "../lib/query";
import { worker } from "../mocks/browser";
import { routeTree } from "../routeTree.gen";
import {
  create,
  FeedSchema,
  ListFeedsResponseSchema,
  toJson,
} from "../test-utils/json-identity";

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
    <QueryClientProvider client={queryClient}>
      {props.children}
    </QueryClientProvider>
  );

  it("displays unread count for each feed", async () => {
    worker.use(
      http.all("*/api/v2/feeds", () => {
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

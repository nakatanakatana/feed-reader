import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { routeTree } from "../routeTree.gen";
import "../styles.css";
import { create, toJson } from "@bufbuild/protobuf";
import { HttpResponse, http } from "msw";
import {
  ListFeedSchema,
  ListFeedsResponseSchema,
  ListFeedTagsResponseSchema,
} from "../gen/feed/v1/feed_pb";
import { ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { worker } from "../mocks/browser";

// Mock Link from solid-router
vi.mock("@tanstack/solid-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/solid-router")>();
  return {
    ...actual,
    Link: (
      props: { to: string; children: JSX.Element } & JSX.IntrinsicElements["a"],
    ) => (
      <a href={props.to} {...props}>
        {props.children}
      </a>
    ),
  };
});

describe("FeedList Responsive", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    queryClient.clear();
  });

  const TestWrapper = (props: { children: JSX.Element }) => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </TransportProvider>
  );

  const setupMockData = (title = "Feed 1", unreadCount = 0n, url = "url1") => {
    worker.use(
      http.post("*/feed.v1.FeedService/ListFeeds", () => {
        const msg = create(ListFeedsResponseSchema, {
          feeds: [
            create(ListFeedSchema, {
              id: "1",
              title,
              url,
              unreadCount,
              tags: [],
            }),
          ],
        });
        return HttpResponse.json(toJson(ListFeedsResponseSchema, msg));
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

  it("is responsive and shows kebab menu / truncates titles", async () => {
    // 1. Desktop view
    await page.viewport?.(1280, 1024);
    const longTitle = "A very long feed title that should definitely truncate on narrow screens to prevent horizontal overflow and layout breakage";
    const longUrl = "https://example.com/a/very/long/path/to/a/feed/that/will/definitely/overflow/on/narrow/viewports/if/not/properly/handled/with/ellipsis/or/truncation";
    setupMockData(longTitle, 5n, longUrl);

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

    // Force refetch
    await queryClient.refetchQueries({ queryKey: ["feeds"] });

    await expect.element(page.getByText(longTitle)).toBeVisible();
    
    // Check if Delete button is visible (Desktop)
    await expect.element(page.getByRole("button", { name: "Delete" })).toBeVisible();

    // 2. Mobile view - Switch viewport
    await page.viewport?.(320, 568);
    
    // Give it a moment to reflow and stabilize
    await new Promise(r => setTimeout(r, 500));

    // Check truncation (ellipsis)
    const titleLink = page.getByText(longTitle);
    const titleElement = (await titleLink.element()) as HTMLElement;
    const styles = window.getComputedStyle(titleElement);
    
    // We expect text-overflow: ellipsis
    expect(styles.textOverflow).toBe("ellipsis");
    expect(styles.whiteSpace).toBe("nowrap");
    expect(styles.overflow).toBe("hidden");

    // Check that the title's actual width is limited (should not exceed viewport)
    const titleRect = titleElement.getBoundingClientRect();
    expect(titleRect.width).toBeLessThan(320);

    // Check kebab menu (Mobile)
    // On mobile, the Delete button should be hidden (display: none)
    await expect.element(page.getByRole("button", { name: "Delete", includeHidden: true })).not.toBeVisible();
    await expect.element(page.getByRole("button", { name: /Actions for/i })).toBeVisible();

    // 3. Check for horizontal overflow
    // The scrollWidth of the body should not exceed its clientWidth
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
    
    const listContainer = document.querySelector("ul");
    if (listContainer) {
      expect(listContainer.scrollWidth).toBeLessThanOrEqual(listContainer.clientWidth);
    }

    // Verify actual truncation of title
    expect(titleElement.scrollWidth).toBeGreaterThan(titleElement.clientWidth);

    // Verify URL truncation (This might fail currently)
    const urlElement = page.getByText(longUrl);
    const urlHtmlElement = (await urlElement.element()) as HTMLElement;
    expect(urlHtmlElement.scrollWidth).toBeGreaterThan(urlHtmlElement.clientWidth);
  });
});

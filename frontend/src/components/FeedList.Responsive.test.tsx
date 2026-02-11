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
  });

  const TestWrapper = (props: { children: JSX.Element }) => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </TransportProvider>
  );

  const setupMockData = () => {
    worker.use(
      http.post("*/feed.v1.FeedService/ListFeeds", () => {
        const msg = create(ListFeedsResponseSchema, {
          feeds: [
            create(ListFeedSchema, {
              id: "1",
              title: "Feed 1",
              url: "url1",
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

  it("hides action buttons from the header on mobile", async () => {
    // Set a narrow viewport
    await page.viewport?.(375, 667);

    setupMockData();

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

    // Wait for content
    await expect.element(page.getByText("Feed 1")).toBeInTheDocument();

    // Select a feed
    const checkbox = page.getByRole("checkbox").first();
    await checkbox.click();

    // Check if the header button is hidden
    const headerContainer = document.querySelector(
      '[data-role="header-manage-tags"]',
    ) as HTMLElement | null;
    if (!headerContainer) {
      throw new Error("Header manage tags container not found");
    }
    const styles = window.getComputedStyle(headerContainer);
    expect(styles.display).toBe("none");
  });

  it("shows a floating action button on mobile when feeds are selected", async () => {
    // Set a narrow viewport
    await page.viewport?.(375, 667);

    setupMockData();

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

    // Select a feed
    const checkbox = page.getByRole("checkbox").first();
    await checkbox.click();

    // Now a FAB should be visible
    // The FAB in FeedList.tsx has "Manage Tags" text and a specific style
    const fab = page.getByRole("button", { name: /Manage Tags/i });
    await expect.element(fab).toBeInTheDocument();

    // Check if it's fixed (FAB)
    const fabElement = (await fab.element()) as HTMLElement;
    // In FeedList.tsx, the container of the FAB has style={{ position: "fixed" }}
    const fabContainer = fabElement.parentElement?.parentElement;
    if (!fabContainer) throw new Error("FAB container not found");
    const containerStyles = window.getComputedStyle(fabContainer);
    expect(containerStyles.position).toBe("fixed");
    expect(containerStyles.display).not.toBe("none");
  });

  it("does not show a floating action button on desktop", async () => {
    // Set a wide viewport
    await page.viewport?.(1024, 768);

    setupMockData();

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

    // Select a feed
    const checkbox = page.getByRole("checkbox").first();
    await checkbox.click();

    // The header button should be visible
    const headerContainer = document.querySelector(
      '[data-role="header-manage-tags"]',
    ) as HTMLElement | null;
    if (!headerContainer) {
      throw new Error("Header manage tags container not found");
    }

    const headerStyles = window.getComputedStyle(headerContainer);
    expect(headerStyles.display).not.toBe("none");

    // The FAB container should be hidden on desktop
    // In FeedList.tsx: <div class={css({ display: "block", sm: { display: "none" }, ... })}>
    // So on desktop (1024px > sm), it should be hidden.
    // There are TWO "Manage Tags" buttons if both are rendered.
    // One in header, one in FAB.
    // The FAB is hidden via display: none on sm and above.

    const buttons = await page
      .getByRole("button", { name: /Manage Tags/i })
      .all();
    // One should be visible, one hidden (or not in document if using Show, but FeedList uses css display)

    // Let's find the one that is NOT in the header
    let fabButton: HTMLElement | undefined;
    for (const b of buttons) {
      const el = (await b.element()) as HTMLElement;
      let parent = el.parentElement;
      let inHeader = false;
      while (parent) {
        if (parent.getAttribute("data-role") === "header-manage-tags") {
          inHeader = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (!inHeader) {
        fabButton = el;
        break;
      }
    }

    if (fabButton) {
      // Wait, the container is hidden, not the button itself maybe?
      const fabContainer = fabButton.parentElement?.parentElement;
      if (fabContainer) {
        const containerStyles = window.getComputedStyle(fabContainer);
        expect(containerStyles.display).toBe("none");
      }
    }
  });
});

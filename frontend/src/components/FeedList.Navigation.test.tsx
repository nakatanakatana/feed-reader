import { render } from "solid-js/web";
import type { JSX } from "solid-js";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { page } from "vitest/browser";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { routeTree } from "../routeTree.gen";
import { useLiveQuery } from "@tanstack/solid-db";
import { useTags } from "../lib/tag-query";
import { queryClient, transport } from "../lib/query";
import { QueryClientProvider } from "@tanstack/solid-query";
import { TransportProvider } from "../lib/transport-context";

// Mock the db module
vi.mock("../lib/db", () => ({
  feeds: {
    delete: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
  },
  items: {
    isReady: vi.fn().mockReturnValue(true),
  },
  addFeed: vi.fn(),
  updateItemStatus: vi.fn(),
}));

// Mock useLiveQuery
vi.mock("@tanstack/solid-db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/solid-db")>();
  return {
    ...actual,
    useLiveQuery: vi.fn(),
  };
});

// Mock Link from solid-router
vi.mock("@tanstack/solid-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/solid-router")>();
  return {
    ...actual,
    Link: (props: any) => {
      let href = props.to;
      if (props.params) {
        for (const [key, value] of Object.entries(props.params)) {
          href = href.replace(`$${key}`, value);
        }
      }
      return (
        <a href={href} {...props}>
          {props.children}
        </a>
      );
    },
  };
});

// Mock useTags
vi.mock("../lib/tag-query", () => ({
  useTags: vi.fn(),
  useCreateTag: vi.fn(),
  useDeleteTag: vi.fn(),
  tagKeys: { all: ["tags"] }
}));

describe("FeedList Navigation", () => {
  let dispose: () => void;

  beforeEach(() => {
    queryClient.clear();
  });

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

  it("has correct navigation links: external title and internal detail icon", async () => {
    const mockFeeds = [
      { 
        uuid: "1", 
        title: "Feed 1", 
        url: "url1", 
        link: "http://external.site", 
        tags: [] 
      },
    ];

    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockFeeds,
    } as unknown as ReturnType<typeof useLiveQuery>);

    vi.mocked(useTags).mockReturnValue({
      data: { tags: [] },
    } as any);

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

    // 1. External title link
    const titleLink = page.getByText("Feed 1") as any;
    await expect.element(titleLink).toBeInTheDocument();
    expect(titleLink.element().getAttribute("href")).toBe("http://external.site");
    expect(titleLink.element().getAttribute("target")).toBe("_blank");

    // 2. Internal detail link icon (This button does not exist yet)
    const detailLink = page.getByRole("link", { name: /view items/i });
    await expect.element(detailLink).toBeInTheDocument();
    expect(detailLink.element().getAttribute("href")).toBe("/feeds/1");
  });
});

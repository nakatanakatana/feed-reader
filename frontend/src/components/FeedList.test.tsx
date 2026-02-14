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

// Mock Link from solid-router to avoid Context issues
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

describe("FeedList", () => {
  let dispose: () => void;

  afterEach(async () => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  const TestWrapper = (props: { children: JSX.Element }) => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </TransportProvider>
  );

  it("displays a list of feeds", async () => {
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

    await expect.element(page.getByText("Example Feed 1")).toBeInTheDocument();
    await expect.element(page.getByText("Example Feed 2")).toBeInTheDocument();

    // Snapshot testing with masking for dynamic timestamps
    const html = document.body.innerHTML.replace(
      /Last fetched: [^<]+/g,
      "Last fetched: MASKED_TIMESTAMP",
    );
    expect(html).toMatchSnapshot();
  });

  it("deletes a feed", async () => {
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

    await expect.element(page.getByText("Example Feed 1")).toBeInTheDocument();

    const deleteButton = page.getByRole("button", { name: "Delete" }).first();

    await deleteButton.click();

    // Wait for the feed to disappear

    await expect
      .element(page.getByText("Example Feed 1"))
      .not.toBeInTheDocument();
  });

  it("supports bulk selection", async () => {
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

    const checkboxes = page.getByRole("checkbox");

    await expect.poll(async () => (await checkboxes.all()).length).toBe(3);

    await checkboxes.nth(1).click();

    await checkboxes.nth(2).click();

    // Bulk action bar should show selected count

    await expect
      .element(page.getByText("2 feeds selected"))
      .toBeInTheDocument();
  });

  it("manages tags for selected feeds", async () => {
    vi.useRealTimers();
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

    const checkboxes = page.getByRole("checkbox");
    await expect.poll(async () => (await checkboxes.all()).length).toBe(3);

    // Select first feed (checkbox at index 1, index 0 is select all)
    await checkboxes.nth(1).click();

    // Click Manage Tags button
    const manageButton = page.getByRole("button", {
      name: /Manage Tags/i,
    });
    await expect.element(manageButton).toBeInTheDocument();
    await manageButton.click();

    // Should show modal

    await expect
      .element(page.getByText("Manage Tags for 1 feeds"))
      .toBeInTheDocument();
  });
});

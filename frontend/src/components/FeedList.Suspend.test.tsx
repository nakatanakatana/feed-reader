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

describe("FeedList Suspend", () => {
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

  it("suspends a feed fetching", async () => {
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

    const suspendSelect = page
      .getByRole("combobox", { name: "Suspend fetching" })
      .first();
    await expect.element(suspendSelect).toBeInTheDocument();

    // Select 1 Day (86400 seconds)
    await suspendSelect.selectOptions("86400");

    // After suspension, the feed should show "Next fetch" in the future
    // In our MSW handler, it will set nextFetch to now + 1 day
    await expect.element(page.getByText(/Next fetch:/)).toBeInTheDocument();
  });

  it("suspends multiple feeds via bulk action", async () => {
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

    // Select all visible feeds
    await checkboxes.nth(0).click();

    await expect
      .element(page.getByText("2 feeds selected"))
      .toBeInTheDocument();

    const bulkSuspendSelect = page.getByRole("combobox", {
      name: "Suspend selected feeds",
    });
    await expect.element(bulkSuspendSelect).toBeInTheDocument();

    // Select 1 Week
    await bulkSuspendSelect.selectOptions("604800");

    // All feeds should show Next fetch
    await expect
      .poll(async () => (await page.getByText(/Next fetch:/).all()).length)
      .toBe(2);
  });
});

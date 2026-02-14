import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import { type JSX, render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { AddFeedForm } from "./AddFeedForm";
import { ActionButton } from "./ui/ActionButton";

describe("AddFeedForm", () => {
  let dispose: () => void;

  beforeEach(() => {
    queryClient.clear();
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const TestWrapper = (props: { headerActions?: JSX.Element }) => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        <AddFeedForm headerActions={props.headerActions} />
      </QueryClientProvider>
    </TransportProvider>
  );

  it("creates a new feed", async () => {
    dispose = render(() => <TestWrapper />, document.body);

    expect(document.body.innerHTML).toMatchSnapshot();

    const input = page.getByPlaceholder("Feed URL");
    await input.fill("http://example.com/new-feed.xml");

    const button = page.getByRole("button", { name: "Add Feed" });
    await button.click();

    // Verify it's in the list (or success state)
    // AddFeedForm clear input on success usually
    await expect.poll(() => input).toHaveValue("");
  });

  it("displays an error message when createFeed fails", async () => {
    // Override handler for this specific test
    worker.use(
      http.post("*/feed.v1.FeedService/CreateFeed", () => {
        return new HttpResponse(
          JSON.stringify({
            code: "invalid_argument",
            message: "Invalid feed URL",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }),
    );

    dispose = render(() => <TestWrapper />, document.body);

    const input = page.getByPlaceholder("Feed URL");
    await input.fill("invalid-url");

    const button = page.getByRole("button", { name: "Add Feed" });
    await button.click();

    await expect
      .element(page.getByText(/Error: .*Invalid feed URL.*/))
      .toBeInTheDocument();
  });

  it("renders headerActions", async () => {
    dispose = render(
      () => (
        <TestWrapper
          headerActions={
            <button data-testid="test-action">Import</button>
          }
        />
      ),
      document.body,
    );

    const action = page.getByTestId("test-action");
    await expect.element(action).toBeInTheDocument();
  });

  it("renders headerActions in the same row as the input", async () => {
    dispose = render(
      () => (
        <TestWrapper
          headerActions={<button data-testid="test-action">Import</button>}
        />
      ),
      document.body,
    );

    const input = page.getByPlaceholder("Feed URL");
    const action = page.getByTestId("test-action");

    // Both should be visible
    await expect.element(input).toBeVisible();
    await expect.element(action).toBeVisible();

    // They should now be direct siblings in the same flex row
    const inputEl = await input.element();
    const actionEl = await action.element();
    expect(inputEl.parentElement).toBe(actionEl.parentElement);
  });

  it("hides action text on mobile", async () => {
    dispose = render(
      () => (
        <TestWrapper
          headerActions={
            <ActionButton
              icon={<span data-testid="icon">ICON</span>}
              hideTextOnMobile
            >
              Import
            </ActionButton>
          }
        />
      ),
      document.body,
    );

    // Default desktop (viewport is usually large enough)
    await expect.element(page.getByText("Import")).toBeVisible();

    // Mobile resize (375px is below 'md' breakpoint which is 768px in Panda)
    await page.viewport(375, 667);

    // On mobile, "Import" should be hidden.
    await expect.element(page.getByText("Import")).not.toBeVisible();
    await expect.element(page.getByTestId("icon")).toBeVisible();
  });

  it("renders tags in a horizontal scroll list", async () => {
    dispose = render(() => <TestWrapper />, document.body);

    const scrollContainer = page.getByTestId("horizontal-scroll-container");
    await expect.element(scrollContainer).toBeInTheDocument();
  });
});

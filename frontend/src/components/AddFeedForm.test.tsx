import { QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { AddFeedForm } from "./AddFeedForm";
import { http, HttpResponse } from "msw";
import { worker } from "../mocks/browser";

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

  const TestWrapper = () => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        <AddFeedForm />
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
});

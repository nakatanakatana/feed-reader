import { create } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { FeedSchema } from "../gen/feed/v1/feed_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { AddFeedForm } from "./AddFeedForm";

const mocks = vi.hoisted(() => ({
  addFeed: vi.fn(),
  feedInsert: vi.fn(),
}));

// Mock the db module
vi.mock("../lib/db", () => mocks);

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
    vi.mocked(mocks.feedInsert).mockResolvedValue(
      // @ts-expect-error
      create(FeedSchema, {
        id: "1",
        url: "http://example.com",
        title: "Mocked Feed",
      }),
    );

    dispose = render(() => <TestWrapper />, document.body);

    const input = page.getByPlaceholder("Feed URL");
    await input.fill("http://example.com");

    const button = page.getByText("Add Feed");
    await button.click();

    await expect
      .poll(() => vi.mocked(mocks.feedInsert).mock.calls.length)
      .toBeGreaterThan(0);
    expect(mocks.feedInsert).toHaveBeenCalledWith("http://example.com", []);
  });

  it("displays an error message when createFeed fails", async () => {
    vi.mocked(mocks.feedInsert).mockRejectedValue(
      new Error("Invalid feed URL"),
    );

    dispose = render(() => <TestWrapper />, document.body);

    const input = page.getByPlaceholder("Feed URL");
    await input.fill("invalid-url");

    const button = page.getByText("Add Feed");
    await button.click();

    await expect
      .element(page.getByText(/Error: .*Invalid feed URL.*/))
      .toBeInTheDocument();
  });
});

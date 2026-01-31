import { create } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { FeedSchema } from "../gen/feed/v1/feed_pb";
import * as db from "../lib/db";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { AddFeedForm } from "./AddFeedForm";

// Mock the db module
vi.mock("../lib/db", () => ({
  addFeed: vi.fn(),
}));

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
    vi.mocked(db.addFeed).mockResolvedValue(
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
      .poll(() => vi.mocked(db.addFeed).mock.calls.length)
      .toBeGreaterThan(0);
    expect(db.addFeed).toHaveBeenCalledWith("http://example.com", []);
  });

  it("displays an error message when createFeed fails", async () => {
    vi.mocked(db.addFeed).mockRejectedValue(new Error("Invalid feed URL"));

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

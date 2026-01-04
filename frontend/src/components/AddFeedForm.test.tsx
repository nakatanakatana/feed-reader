import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { AddFeedForm } from "./AddFeedForm";

describe("AddFeedForm", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  const transport = createConnectTransport({
    baseUrl: "http://localhost:3000",
  });

  it("creates a new feed", async () => {
    const createFeedMock = vi.fn();

    worker.use(
      http.post("*/feed.v1.FeedService/CreateFeed", async ({ request }) => {
        const body = (await request.json()) as any;
        createFeedMock(body);
        return HttpResponse.json({
          feed: {
            uuid: "1",
            url: body.url,
            title: "Mocked Feed",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      }),
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <AddFeedForm />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    const input = page.getByPlaceholder("Feed URL");
    await input.fill("http://example.com");

    const button = page.getByText("Add Feed");
    await button.click();

    await expect
      .poll(() => createFeedMock.mock.calls.length)
      .toBeGreaterThan(0);
    expect(createFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: "http://example.com" }),
    );
  });

  it("displays an error message when createFeed fails", async () => {
    worker.use(
      http.post("*/feed.v1.FeedService/CreateFeed", () => {
        return new HttpResponse(
          JSON.stringify({ message: "Invalid feed URL", code: 3 }),
          {
            status: 400, // InvalidArgument -> 400
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
      },
    });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <AddFeedForm />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    const input = page.getByPlaceholder("Feed URL");
    await input.fill("invalid-url");

    const button = page.getByText("Add Feed");
    await button.click();

    await expect
      .element(page.getByText(/Error: .*Invalid feed URL.*/))
      .toBeInTheDocument();
  });
});

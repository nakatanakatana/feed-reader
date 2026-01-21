import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { TransportProvider } from "../lib/transport-context";
import { ItemList } from "./ItemList";
import { createConnectTransport } from "@connectrpc/connect-web";

describe("ItemList", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  const transport = createConnectTransport({
    baseUrl: "http://localhost:3000",
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  it("renders a list of items", async () => {
    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemList />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    // Should show loading initially or eventually show items
    await expect.element(page.getByText("Item 1", { exact: true })).toBeInTheDocument();
    await expect.element(page.getByText("Item 20", { exact: true })).toBeInTheDocument();
  });

  it("loads more items when button is clicked", async () => {
    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemList />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    await expect.element(page.getByText("Item 1", { exact: true })).toBeInTheDocument();
    
    const loadMoreButton = page.getByRole("button", { name: /Load More/i });
    await loadMoreButton.click();

    await expect.element(page.getByText("Item 21", { exact: true })).toBeInTheDocument();
    await expect.element(page.getByText("Item 40", { exact: true })).toBeInTheDocument();
  });
});

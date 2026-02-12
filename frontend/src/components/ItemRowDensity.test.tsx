import { QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { ItemRow } from "./ItemRow";

describe("ItemRow Density", () => {
  const mockItem = {
    id: "1",
    title: "Test Article Title",
    publishedAt: "2026-01-21T10:00:00Z",
    createdAt: "2026-01-20T10:00:00Z",
    description: "This is a test description snippet.",
    isRead: false,
    feedId: "feed-1",
  };

  it("has reduced vertical padding", async () => {
    render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemRow item={mockItem} onClick={() => {}} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    const button = page.getByRole("button", { name: "Test Article Title" });
    await expect.element(button).toBeInTheDocument();

    const style = window.getComputedStyle(button.element());

    // Initial padding: "3" which is 12px.
    // We want to reduce it, e.g., to "2" (8px) or "1.5" (6px).
    const paddingTop = parseInt(style.paddingTop, 10);
    const paddingBottom = parseInt(style.paddingBottom, 10);

    // This should fail initially as 12 >= 10
    expect(paddingTop).toBeLessThan(10);
    expect(paddingBottom).toBeLessThan(10);
  });
});

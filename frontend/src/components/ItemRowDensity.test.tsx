import { QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { ItemRow } from "./ItemRow";

describe("ItemRow Density", () => {
  let dispose: () => void;

  afterEach(() => {
    dispose?.();
    document.body.innerHTML = "";
    queryClient.clear();
  });

  const mockItem = {
    id: "1",
    title: "Test Article Title",
    publishedAt: new Date("2026-03-01T00:00:00Z"),
    createdAt: new Date("2026-03-01T00:00:00Z"),
    description: "This is a test description snippet.",
    isRead: false,
    feedId: "feed-1",
  };

  it("has reduced vertical padding", async () => {
    dispose = render(
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

    // Verify reduced vertical padding.
    // We expect it to be less than 10px (previously it was 12px / "3" units).
    const paddingTop = parseInt(style.paddingTop, 10);
    const paddingBottom = parseInt(style.paddingBottom, 10);

    expect(paddingTop).toBeLessThan(10);
    expect(paddingBottom).toBeLessThan(10);
  });
});

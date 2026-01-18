import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { Item } from "../gen/feed/v1/feed_pb";
import { ItemDetail } from "./ItemDetail";

describe("ItemDetail", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  const mockItem = new Item({
    id: "1",
    title: "Detailed Item",
    content: "<p>Full content</p>",
    url: "http://example.com",
    publishedAt: "2026-01-18T10:00:00Z",
  });

  it("renders full content", async () => {
    dispose = render(
      () => <ItemDetail item={mockItem} onClose={() => {}} />,
      document.body,
    );

    await expect.element(page.getByText("Detailed Item")).toBeInTheDocument();
    await expect.element(page.getByText("Full content")).toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: "Original Article" }))
      .toBeInTheDocument();
  });

  it("calls onClose when Close button clicked", async () => {
    const onClose = vi.fn();
    dispose = render(
      () => <ItemDetail item={mockItem} onClose={onClose} />,
      document.body,
    );

    const closeButton = page.getByText("Close");
    await closeButton.click();
    expect(onClose).toHaveBeenCalled();
  });
});

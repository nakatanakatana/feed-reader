import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { Item } from "../gen/feed/v1/feed_pb";
import { ItemCard } from "./ItemCard";

describe("ItemCard", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  const mockItem = new Item({
    id: "1",
    title: "Test Item",
    description: "Test Description",
    isRead: false,
    publishedAt: "2026-01-18T10:00:00Z",
  });

  it("renders item details", async () => {
    dispose = render(
      () => (
        <ItemCard item={mockItem} onClick={() => {}} onMarkRead={() => {}} />
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();
    await expect
      .element(page.getByText("Test Description"))
      .toBeInTheDocument();
    await expect.element(page.getByText("Mark as read")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    dispose = render(
      () => (
        <ItemCard item={mockItem} onClick={onClick} onMarkRead={() => {}} />
      ),
      document.body,
    );

    const card = page.getByRole("button", { name: /Test Item/ });
    await card.click();
    expect(onClick).toHaveBeenCalledWith(mockItem);
  });

  it("calls onMarkRead when button clicked", async () => {
    const onMarkRead = vi.fn();
    dispose = render(
      () => (
        <ItemCard item={mockItem} onClick={() => {}} onMarkRead={onMarkRead} />
      ),
      document.body,
    );

    const button = page.getByText("Mark as read");
    await button.click();
    expect(onMarkRead).toHaveBeenCalledWith("1");
  });
});

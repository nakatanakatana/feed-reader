import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { ItemList } from "./ItemList";

// Mock the db module
vi.mock("../lib/db", () => ({
  items: {
    isReady: vi.fn().mockReturnValue(true),
  },
  updateItemStatus: vi.fn(),
}));

// Mock useLiveQuery
vi.mock("@tanstack/solid-db", () => ({
  useLiveQuery: vi.fn(),
  eq: vi.fn(),
}));

import { useLiveQuery } from "@tanstack/solid-db";

describe("ItemList", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders a list of items", async () => {
    const mockItems = [
      { id: "1", title: "Item 1", url: "http://example.com/1", isRead: false },
      { id: "20", title: "Item 20", url: "http://example.com/20", isRead: true },
    ];

    vi.mocked(useLiveQuery).mockReturnValue({
      data: mockItems,
    } as any);

    dispose = render(() => <ItemList />, document.body);

    await expect
      .element(page.getByText("Item 1", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Item 20", { exact: true }))
      .toBeInTheDocument();
  });
});
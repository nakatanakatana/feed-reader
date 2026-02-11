import { describe, expect, it, vi, beforeEach } from "vitest";
import { queryClient } from "./query";
import { prefetchItems } from "./item-prefetch";
import { getItem } from "./item-db";

vi.mock("./item-db", () => ({
  getItem: vi.fn(),
}));

describe("prefetchItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls queryClient.prefetchQuery for each item ID", async () => {
    const prefetchSpy = vi.spyOn(queryClient, "prefetchQuery");
    const itemIds = ["item1", "item2", "item3"];

    await prefetchItems(itemIds);

    expect(prefetchSpy).toHaveBeenCalledTimes(3);
    expect(prefetchSpy).toHaveBeenCalledWith({
      queryKey: ["item", "item1"],
      queryFn: expect.any(Function),
    });
    expect(prefetchSpy).toHaveBeenCalledWith({
      queryKey: ["item", "item2"],
      queryFn: expect.any(Function),
    });
    expect(prefetchSpy).toHaveBeenCalledWith({
      queryKey: ["item", "item3"],
      queryFn: expect.any(Function),
    });
  });

  it("does not call prefetchQuery if itemIds is empty", async () => {
    const prefetchSpy = vi.spyOn(queryClient, "prefetchQuery");
    await prefetchItems([]);
    expect(prefetchSpy).not.toHaveBeenCalled();
  });
});

describe("getPrefetchIds", () => {
  const items = [
    { id: "0" },
    { id: "1" },
    { id: "2" },
    { id: "3" },
    { id: "4" },
    { id: "5" },
    { id: "6" },
    { id: "7" },
    { id: "8" },
    { id: "9" },
  ];

  it("returns up to 3 items before and after the current index", async () => {
    const { getPrefetchIds } = await import("./item-prefetch");
    const ids = getPrefetchIds(5, items);
    // 2, 3, 4 (before) and 6, 7, 8 (after)
    expect(ids).toEqual(["2", "3", "4", "6", "7", "8"]);
  });

  it("handles start of list", async () => {
    const { getPrefetchIds } = await import("./item-prefetch");
    const ids = getPrefetchIds(0, items);
    // nothing before, 1, 2, 3 (after)
    expect(ids).toEqual(["1", "2", "3"]);
  });

  it("handles end of list", async () => {
    const { getPrefetchIds } = await import("./item-prefetch");
    const ids = getPrefetchIds(9, items);
    // 6, 7, 8 (before), nothing after
    expect(ids).toEqual(["6", "7", "8"]);
  });

  it("handles near start of list", async () => {
    const { getPrefetchIds } = await import("./item-prefetch");
    const ids = getPrefetchIds(1, items);
    // 0 (before), 2, 3, 4 (after)
    expect(ids).toEqual(["0", "2", "3", "4"]);
  });

  it("handles empty items", async () => {
    const { getPrefetchIds } = await import("./item-prefetch");
    const ids = getPrefetchIds(0, []);
    expect(ids).toEqual([]);
  });

  it("handles invalid index", async () => {
    const { getPrefetchIds } = await import("./item-prefetch");
    const ids = getPrefetchIds(-1, items);
    expect(ids).toEqual([]);
  });
});

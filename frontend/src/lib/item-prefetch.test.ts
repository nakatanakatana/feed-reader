import { beforeEach, describe, expect, it, vi } from "vitest";
import { prefetchItems } from "./item-prefetch";
import { queryClient } from "./query";

vi.mock("./item-db", () => ({
  getItem: vi.fn(),
}));

describe("prefetchItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("calls queryClient.prefetchQuery for each item ID with staleTime", async () => {
    const prefetchSpy = vi.spyOn(queryClient, "prefetchQuery");
    const itemIds = ["item1", "item2", "item3"];

    await prefetchItems(itemIds);

    expect(prefetchSpy).toHaveBeenCalledTimes(3);
    expect(prefetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["item", "item1"],
        staleTime: 5 * 60 * 1000,
      }),
    );
  });

  it("skips items that are already in the cache", async () => {
    const prefetchSpy = vi.spyOn(queryClient, "prefetchQuery");
    const getQueryDataSpy = vi
      .spyOn(queryClient, "getQueryData")
      .mockImplementation((key) => {
        if (Array.isArray(key) && key[1] === "item1") return { id: "item1" };
        return undefined;
      });

    const itemIds = ["item1", "item2"];

    await prefetchItems(itemIds);

    expect(prefetchSpy).toHaveBeenCalledTimes(1);
    expect(prefetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["item", "item2"],
      }),
    );

    getQueryDataSpy.mockRestore();
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

  it("handles invalid index (negative)", async () => {
    const { getPrefetchIds } = await import("./item-prefetch");
    const ids = getPrefetchIds(-1, items);
    expect(ids).toEqual([]);
  });

  it("handles invalid index (exceeds length)", async () => {
    const { getPrefetchIds } = await import("./item-prefetch");
    const ids = getPrefetchIds(items.length, items);
    expect(ids).toEqual([]);
  });

  it("handles invalid index (far exceeds length)", async () => {
    const { getPrefetchIds } = await import("./item-prefetch");
    const ids = getPrefetchIds(100, items);
    expect(ids).toEqual([]);
  });
});

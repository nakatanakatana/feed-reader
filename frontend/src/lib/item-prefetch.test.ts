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
    { id: "a" },
    { id: "b" },
    { id: "c" },
    { id: "d" },
    { id: "e" },
    { id: "f" },
    { id: "g" },
    { id: "h" },
    { id: "i" },
    { id: "j" },
    { id: "k" },
    { id: "l" },
  ];

  it("returns up to 5 items after the current index", async () => {
    const { getPrefetchIds } = await import("./item-prefetch");
    const ids = getPrefetchIds(5, items);
    // f is 5. Next 5: g, h, i, j, k
    expect(ids).toEqual(["g", "h", "i", "j", "k"]);
  });

  it("handles start of list", async () => {
    const { getPrefetchIds } = await import("./item-prefetch");
    const ids = getPrefetchIds(0, items);
    // a is 0. Next 5: b, c, d, e, f
    expect(ids).toEqual(["b", "c", "d", "e", "f"]);
  });

  it("handles end of list", async () => {
    const { getPrefetchIds } = await import("./item-prefetch");
    const ids = getPrefetchIds(11, items);
    // nothing after
    expect(ids).toEqual([]);
  });

  it("handles near end of list", async () => {
    const { getPrefetchIds } = await import("./item-prefetch");
    const ids = getPrefetchIds(8, items);
    // i is 8. Next 5 but only 3 left: j, k, l
    expect(ids).toEqual(["j", "k", "l"]);
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

import { describe, expect, it } from "vitest";
import { getItemsQueryOptions, mapOpenAPIItem } from "./item-db";

describe("items query options", () => {
  it("should return correct query options", () => {
    const options = getItemsQueryOptions(false, "30d");
    expect(options).toBeDefined();
    expect(options.queryKey).toEqual([
      "items",
      { since: "30d", showRead: false },
    ]);
    expect(options.refetchInterval).toBe(60000);
  });
});

describe("mapOpenAPIItem", () => {
  it("defaults content to empty string when omitted from OpenAPI item", () => {
    const itemWithoutContent = {
      id: "item-1",
      url: "https://example.com/item",
      title: "Example Title",
      description: "Example Description",
      feedId: "feed-1",
      isRead: false,
      author: "Author",
      imageUrl: "",
      categories: "",
      createdAt: new Date().toISOString(),
    };

    const mapped = mapOpenAPIItem(itemWithoutContent as any);
    expect(mapped.content).toBe("");
  });
});

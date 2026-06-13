import { describe, expect, it } from "vitest";
import { getItemsQueryOptions } from "./item-db";

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

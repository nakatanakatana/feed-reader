import { describe, expect, it } from "vitest";
import { feedsQueryOptions, tagsQueryOptions } from "./db";

describe("db query options", () => {
  it("should have feeds query options", () => {
    expect(feedsQueryOptions).toBeDefined();
    expect(feedsQueryOptions.queryKey).toEqual(["feeds"]);
  });

  it("should have tags query options", () => {
    expect(tagsQueryOptions).toBeDefined();
    expect(tagsQueryOptions.queryKey).toEqual(["tags"]);
  });
});

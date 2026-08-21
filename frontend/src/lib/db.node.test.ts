import { describe, expect, it } from "vitest";
import {
  feedsQueryOptions,
  ignoreWindowsQueryOptions,
  tagsQueryOptions,
} from "./db";

describe("db query options", () => {
  it("should have feeds query options", () => {
    expect(feedsQueryOptions).toBeDefined();
    expect(feedsQueryOptions.queryKey).toEqual(["feeds"]);
  });

  it("should have tags query options", () => {
    expect(tagsQueryOptions).toBeDefined();
    expect(tagsQueryOptions.queryKey).toEqual(["tags"]);
  });

  it("should have ignore-windows query options", () => {
    expect(ignoreWindowsQueryOptions).toBeDefined();
    expect(ignoreWindowsQueryOptions.queryKey).toEqual(["ignore-windows"]);
  });
});

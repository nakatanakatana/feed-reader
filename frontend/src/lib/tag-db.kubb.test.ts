import { describe, expect, it } from "vitest";

describe("tag-db kubb integration", () => {
  it("tagsQueryOptions.queryFn maps openapi tags to domain tags with bigint counts", async () => {
    const { tagsQueryOptions } = await import("./tag-db");

    const result = await tagsQueryOptions.queryFn();

    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every(
        (tag) =>
          typeof tag.unreadCount === "bigint" &&
          typeof tag.feedCount === "bigint",
      ),
    ).toBe(true);
  });
});

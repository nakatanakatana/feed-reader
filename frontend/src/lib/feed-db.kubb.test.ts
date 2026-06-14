import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { feedTagsQueryOptions, feedsQueryOptions } from "./feed-db";
import { queryClient } from "./query";
import type { Tag } from "./tag-db";

describe("feed-db kubb CRUD migration", () => {
  beforeEach(() => {
    vi.spyOn(queryClient, "invalidateQueries");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("feedsQueryOptions.queryFn uses feedsList and maps unreadCount to bigint", async () => {
    const result = await feedsQueryOptions.queryFn();

    expect(feedsQueryOptions.queryKey).toEqual(["feeds"]);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((feed) => typeof feed.unreadCount === "bigint")).toBe(
      true,
    );
  });

  it("feedInsert uses feedsCreate and invalidates feeds", async () => {
    const { feedInsert } = await import("./feed-db");
    const tags: Tag[] = [
      {
        id: "tag-1",
        name: "Tech",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        unreadCount: 0n,
        feedCount: 0n,
      },
    ];

    await feedInsert("https://example.com/new.xml", tags);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["feeds"],
    });
  });

  it("feedDelete uses feedsDelete and preserves invalidation behavior", async () => {
    const { feedDelete } = await import("./feed-db");

    const feeds = await feedsQueryOptions.queryFn();
    await feedDelete(feeds[0].id);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["feeds"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["tags"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["feed-tags"],
    });
  });

  it("feedTagsQueryOptions.queryFn uses feedTagsList and maps composite id", async () => {
    const result = await feedTagsQueryOptions.queryFn();

    expect(feedTagsQueryOptions.queryKey).toEqual(["feed-tags"]);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBe(`${result[0].feedId}-${result[0].tagId}`);
  });

  it("manageFeedTags uses feedTagsManage and preserves invalidation behavior", async () => {
    const { manageFeedTags } = await import("./feed-db");

    const feeds = await feedsQueryOptions.queryFn();
    const feedTags = await feedTagsQueryOptions.queryFn();

    await manageFeedTags({
      feedIds: [feeds[0].id],
      addTagIds: [feedTags[0].tagId],
      removeTagIds: [],
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["feeds"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["tags"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["feed-tags"],
    });
  });
});

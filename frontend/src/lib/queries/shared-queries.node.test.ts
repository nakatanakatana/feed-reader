import { describe, expect, it } from "vitest";
import {
  getFeedList,
  getTagPicker,
  getTagsWithFeedCount,
} from "./feed-queries";
import { getItemsWithReadState, getTagUnreadCounts } from "./item-queries";

describe("shared pure TypeScript query selectors", () => {
  it("builds tags with feed count", () => {
    const mockTags = [
      { id: "tag-1", name: "Tech" },
      { id: "tag-2", name: "News" },
    ];
    const mockFeedTags = [
      { id: "feed-1-tag-1", feedId: "feed-1", tagId: "tag-1" },
      { id: "feed-2-tag-1", feedId: "feed-2", tagId: "tag-1" },
    ];
    const result = getTagsWithFeedCount(mockTags, mockFeedTags);
    expect(result).toEqual([
      expect.objectContaining({ id: "tag-1", feedCount: 2n }),
      expect.objectContaining({ id: "tag-2", feedCount: 0n }),
    ]);
  });

  it("builds article queries with merged read state and tag filtering", () => {
    const mockItems = [
      {
        id: "item-1",
        title: "Alpha",
        feedId: "feed-1",
        isRead: false,
        publishedAt: new Date("2026-03-01T00:00:00Z"),
        createdAt: new Date("2026-03-01T00:00:00Z"),
      },
      {
        id: "item-2",
        title: "Beta",
        feedId: "feed-2",
        isRead: false,
        publishedAt: new Date("2026-03-02T00:00:00Z"),
        createdAt: new Date("2026-03-02T00:00:00Z"),
      },
    ];

    const mockReads = [
      {
        id: "item-1",
        isRead: true,
        updatedAt: new Date("2026-03-03T00:00:00Z"),
      },
    ];

    const mockFeedTags = [
      { id: "feed-1-tag-1", feedId: "feed-1", tagId: "tag-1" },
      { id: "feed-2-tag-2", feedId: "feed-2", tagId: "tag-2" },
    ];

    const result = getItemsWithReadState(mockItems, mockReads, mockFeedTags, {
      tagId: "tag-1",
    });

    expect(result).toEqual([
      expect.objectContaining({
        id: "item-1",
        feedId: "feed-1",
        isRead: true,
      }),
    ]);
  });

  it("builds tag unread counts from shared sources", () => {
    const mockTags = [
      { id: "tag-1", name: "Tech" },
      { id: "tag-2", name: "News" },
    ];

    const mockFeedTags = [
      { id: "feed-1-tag-1", feedId: "feed-1", tagId: "tag-1" },
      { id: "feed-2-tag-1", feedId: "feed-2", tagId: "tag-1" },
      { id: "feed-2-tag-2", feedId: "feed-2", tagId: "tag-2" },
    ];

    const mockUnreadItems = [
      { id: "item-1", feedId: "feed-1", isRead: false },
      { id: "item-2", feedId: "feed-2", isRead: false },
      { id: "item-3", feedId: "feed-2", isRead: false },
    ];

    const result = getTagUnreadCounts(mockTags, mockFeedTags, mockUnreadItems);

    expect(result).toMatchObject([
      { id: "tag-1", name: "Tech", unreadCount: 3n },
      { id: "tag-2", name: "News", unreadCount: 2n },
    ]);
  });

  it("builds feed list queries with shared filtering and sorting", () => {
    const mockFeeds = [
      { id: "feed-1", title: "Gamma", url: "https://example.com/gamma" },
      { id: "feed-2", title: "Alpha", url: "https://example.com/alpha" },
      { id: "feed-3", title: "Beta", url: "https://example.com/beta" },
    ];

    const mockFeedTags = [
      { id: "feed-1-tag-1", feedId: "feed-1", tagId: "tag-1" },
    ];

    const result = getFeedList(mockFeeds, mockFeedTags, {
      tagId: null,
      sortBy: "title_asc",
    });

    expect(result.map((feed) => feed.id)).toEqual(["feed-2", "feed-3"]);
  });

  it("builds tag picker queries with shared ordering", () => {
    const mockTags = [
      { id: "tag-1", name: "Low", feedCount: 1n },
      { id: "tag-2", name: "High", feedCount: 5n },
    ];

    const result = getTagPicker(mockTags);

    expect(result.map((tag) => tag.id)).toEqual(["tag-2", "tag-1"]);
  });
});

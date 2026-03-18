import {
  createCollection,
  createLiveQueryCollection,
  localOnlyCollectionOptions,
} from "@tanstack/solid-db";
import { describe, expect, it } from "vite-plus/test";

import { buildFeedListQuery, buildTagPickerQuery } from "./feed-queries";
import { buildItemsWithReadStateQuery, buildTagUnreadCountsQuery } from "./item-queries";

describe("shared TanStack DB query builders", () => {
  it("builds article queries with merged read state and tag filtering", async () => {
    const itemCollection = createCollection(
      localOnlyCollectionOptions({
        getKey: (item: { id: string }) => item.id,
        initialData: [
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
        ],
      }),
    );

    const readCollection = createCollection(
      localOnlyCollectionOptions({
        getKey: (item: { id: string }) => item.id,
        initialData: [
          {
            id: "item-1",
            isRead: true,
            updatedAt: new Date("2026-03-03T00:00:00Z"),
          },
        ],
      }),
    );

    const feedTagCollection = createCollection(
      localOnlyCollectionOptions({
        getKey: (item: { id: string }) => item.id,
        initialData: [
          { id: "feed-1-tag-1", feedId: "feed-1", tagId: "tag-1" },
          { id: "feed-2-tag-2", feedId: "feed-2", tagId: "tag-2" },
        ],
      }),
    );

    const query = createLiveQueryCollection((q) =>
      buildItemsWithReadStateQuery(q, {
        itemCollection,
        readCollection,
        feedTagCollection,
        tagId: "tag-1",
      }),
    );

    expect(await query.toArrayWhenReady()).toEqual([
      expect.objectContaining({
        id: "item-1",
        feedId: "feed-1",
        isRead: true,
      }),
    ]);
  });

  it("builds tag unread counts from shared sources", async () => {
    const tagsCollection = createCollection(
      localOnlyCollectionOptions({
        getKey: (item: { id: string }) => item.id,
        initialData: [
          { id: "tag-1", name: "Tech" },
          { id: "tag-2", name: "News" },
        ],
      }),
    );

    const feedTagCollection = createCollection(
      localOnlyCollectionOptions({
        getKey: (item: { id: string }) => item.id,
        initialData: [
          { id: "feed-1-tag-1", feedId: "feed-1", tagId: "tag-1" },
          { id: "feed-2-tag-1", feedId: "feed-2", tagId: "tag-1" },
          { id: "feed-2-tag-2", feedId: "feed-2", tagId: "tag-2" },
        ],
      }),
    );

    const unreadItemsCollection = createCollection(
      localOnlyCollectionOptions({
        getKey: (item: { id: string }) => item.id,
        initialData: [
          { id: "item-1", feedId: "feed-1" },
          { id: "item-2", feedId: "feed-2" },
          { id: "item-3", feedId: "feed-2" },
        ],
      }),
    );

    const query = createLiveQueryCollection((q) =>
      buildTagUnreadCountsQuery(q, {
        tagsCollection,
        feedTagCollection,
        unreadItemsCollection,
      }),
    );

    expect(await query.toArrayWhenReady()).toEqual([
      { id: "tag-1", name: "Tech", unreadCount: 3 },
      { id: "tag-2", name: "News", unreadCount: 2 },
    ]);
  });

  it("builds feed list queries with shared filtering and sorting", async () => {
    const feedsCollection = createCollection(
      localOnlyCollectionOptions({
        getKey: (item: { id: string }) => item.id,
        initialData: [
          { id: "feed-1", title: "Gamma", url: "https://example.com/gamma" },
          { id: "feed-2", title: "Alpha", url: "https://example.com/alpha" },
          { id: "feed-3", title: "Beta", url: "https://example.com/beta" },
        ],
      }),
    );

    const feedTagCollection = createCollection(
      localOnlyCollectionOptions({
        getKey: (item: { id: string }) => item.id,
        initialData: [{ id: "feed-1-tag-1", feedId: "feed-1", tagId: "tag-1" }],
      }),
    );

    const query = createLiveQueryCollection((q) =>
      buildFeedListQuery(q, {
        feedsCollection,
        feedTagCollection,
        tagId: null,
        sortBy: "title_asc",
      }),
    );

    expect((await query.toArrayWhenReady()).map((feed) => feed.id)).toEqual(["feed-2", "feed-3"]);
  });

  it("builds tag picker queries with shared ordering", async () => {
    const tagsCollection = createCollection(
      localOnlyCollectionOptions({
        getKey: (item: { id: string }) => item.id,
        initialData: [
          { id: "tag-1", name: "Low", feedCount: 1n },
          { id: "tag-2", name: "High", feedCount: 5n },
        ],
      }),
    );

    const query = createLiveQueryCollection((q) => buildTagPickerQuery(q, { tagsCollection }));

    expect((await query.toArrayWhenReady()).map((tag) => tag.id)).toEqual(["tag-2", "tag-1"]);
  });
});

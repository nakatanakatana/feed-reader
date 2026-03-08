import { create } from "@bufbuild/protobuf";
import {
  CreateFeedResponseSchema,
  DeleteFeedResponseSchema,
  type Feed,
  FeedSchema,
  FeedService,
  ListFeedsResponseSchema,
  ListFeedTagsResponseSchema,
  ManageFeedTagsResponseSchema,
  SetFeedTagsResponseSchema,
  SuspendFeedsResponseSchema,
  UpdateFeedResponseSchema,
} from "../gen/feed/v1/feed_pb";
import {
  AddItemBlockRulesResponseSchema,
  AddURLParsingRuleResponseSchema,
  DeleteItemBlockRuleResponseSchema,
  DeleteURLParsingRuleResponseSchema,
  GetItemResponseSchema,
  type Item,
  ItemSchema,
  ItemService,
  ListItemBlockRulesResponseSchema,
  ListItemReadResponseSchema,
  ListItemsResponseSchema,
  ListURLParsingRulesResponseSchema,
  UpdateItemStatusResponseSchema,
  URLParsingRuleSchema,
} from "../gen/item/v1/item_pb";
import {
  CreateTagResponseSchema,
  DeleteTagResponseSchema,
  ListTagsResponseSchema,
  type Tag,
  TagSchema,
  TagService,
} from "../gen/tag/v1/tag_pb";
import { dateToTimestamp } from "../lib/item-utils";
import { mockConnectWeb, safeJson } from "./connect";

const tags: Tag[] = [];
const feeds: Feed[] = [];
const items: Item[] = [];
const itemReads = new Map<string, { isRead: boolean; updatedAt: Date }>();

const timestampToDate = (ts: any): Date | undefined => {
  if (!ts) return undefined;
  if (ts instanceof Date) return ts;
  if (typeof ts === "string") {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  if (ts.seconds !== undefined && ts.nanos !== undefined) {
    const d = new Date(Number(ts.seconds) * 1000 + Number(ts.nanos) / 1000000);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

export const resetState = () => {
  console.log("MSW: resetState called");
  tags.length = 0;
  itemReads.clear();
  const now = new Date("2026-03-01T00:00:00Z");
  tags.push(
    create(TagSchema, {
      id: "tag-1",
      name: "Tech",
      createdAt: dateToTimestamp(now),
      updatedAt: dateToTimestamp(now),
      unreadCount: 5n,
      feedCount: 1n,
    }),
    create(TagSchema, {
      id: "tag-2",
      name: "News",
      createdAt: dateToTimestamp(now),
      updatedAt: dateToTimestamp(now),
      unreadCount: 3n,
      feedCount: 2n,
    }),
  );

  feeds.length = 0;
  feeds.push(
    create(FeedSchema, {
      id: "1",
      url: "https://example.com/feed1.xml",
      link: "https://example.com/",
      title: "Example Feed 1",
      lastFetchedAt: dateToTimestamp(now),
      createdAt: dateToTimestamp(now),
      updatedAt: dateToTimestamp(now),
      tags: [tags[0]],
    }),
    create(FeedSchema, {
      id: "2",
      url: "https://example.com/feed2.xml",
      link: "https://example.com/news",
      title: "Example Feed 2",
      lastFetchedAt: dateToTimestamp(now),
      createdAt: dateToTimestamp(now),
      updatedAt: dateToTimestamp(now),
      tags: [tags[1]],
    }),
  );

  items.length = 0;
  for (let i = 0; i < 40; i++) {
    const id = (i + 1).toString();
    const date = new Date(now);
    if (i < 10) date.setHours(date.getHours() - i);
    else if (i < 20) date.setDate(date.getDate() - 2);
    else if (i < 30) date.setDate(date.getDate() - 10);
    else date.setDate(date.getDate() - 40);

    items.push(
      create(ItemSchema, {
        id,
        title: `Item ${id}`,
        publishedAt: dateToTimestamp(date),
        createdAt: dateToTimestamp(date),
        isRead: false,
        description: `<p>Full content for item ${id}</p>`,
        author: "Mock Author",
        url: `https://example.com/item${id}`,
      }),
    );
  }
};

// Initial state
resetState();

export const handlers = [
  mockConnectWeb(FeedService)({
    method: "listFeeds",
    handler: (req) => {
      let filteredFeeds = feeds;

      if (req.tagId) {
        filteredFeeds = feeds.filter((f) =>
          f.tags.some((t: Tag) => t.id === req.tagId),
        );
      }
      return create(ListFeedsResponseSchema, { feeds: filteredFeeds });
    },
  }),

  mockConnectWeb(FeedService)({
    method: "suspendFeeds",
    handler: (req) => {
      const nextFetchDate = new Date(
        Date.now() + Number(req.suspendSeconds) * 1000,
      );
      const nextFetchAt = dateToTimestamp(nextFetchDate);
      for (const id of req.ids || []) {
        const feed = feeds.find((f) => f.id === id);
        if (feed) {
          feed.nextFetchAt = nextFetchAt;
        }
      }
      return create(SuspendFeedsResponseSchema, {});
    },
  }),

  mockConnectWeb(FeedService)({
    method: "createFeed",
    handler: (req) => {
      const newFeed = create(FeedSchema, {
        id: crypto.randomUUID(),
        url: req.url,
        title: req.title || "New Feed",
        createdAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
        updatedAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
        tags: (req.tagIds || []).map(
          (id) =>
            tags.find((t) => t.id === id) ||
            create(TagSchema, { id, name: "Unknown" }),
        ),
      });
      // In-memory update for the session
      feeds.push(newFeed);
      tags.forEach((t) => {
        const count = feeds.filter((f) =>
          f.tags.some((ft: Tag) => ft.id === t.id),
        ).length;
        t.feedCount = BigInt(count);
      });
      return create(CreateFeedResponseSchema, { feed: newFeed });
    },
  }),

  mockConnectWeb(FeedService)({
    method: "updateFeed",
    handler: (req) => {
      const index = feeds.findIndex((f) => f.id === req.id);
      if (index !== -1) {
        if (req.title) feeds[index].title = req.title;
        if (req.tagIds) {
          feeds[index].tags = req.tagIds.map(
            (id) =>
              tags.find((t) => t.id === id) ||
              create(TagSchema, { id, name: "Unknown" }),
          );
        }
        tags.forEach((t) => {
          const count = feeds.filter((f) =>
            f.tags.some((ft: Tag) => ft.id === t.id),
          ).length;
          t.feedCount = BigInt(count);
        });
        feeds[index].updatedAt = dateToTimestamp(
          new Date("2026-03-01T00:00:00Z"),
        );
        return create(UpdateFeedResponseSchema, { feed: feeds[index] });
      }
      throw new Error("Feed not found");
    },
  }),

  mockConnectWeb(FeedService)({
    method: "deleteFeed",
    handler: (req) => {
      console.log("MSW: deleteFeed called for id:", req.id);
      const index = feeds.findIndex((f) => f.id === req.id);
      if (index !== -1) {
        feeds.splice(index, 1);
        console.log("MSW: feed deleted, remaining:", feeds.length);
        tags.forEach((t) => {
          const count = feeds.filter((f) =>
            f.tags.some((ft: Tag) => ft.id === t.id),
          ).length;
          t.feedCount = BigInt(count);
        });
      }
      return create(DeleteFeedResponseSchema, {});
    },
  }),

  mockConnectWeb(TagService)({
    method: "listTags",
    handler: () => {
      return create(ListTagsResponseSchema, { tags });
    },
  }),

  mockConnectWeb(TagService)({
    method: "createTag",
    handler: (req) => {
      const newTag = create(TagSchema, {
        id: crypto.randomUUID(),
        name: req.name,
        createdAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
        updatedAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
        feedCount: 0n,
      });
      tags.push(newTag);
      return create(CreateTagResponseSchema, { tag: newTag });
    },
  }),

  mockConnectWeb(TagService)({
    method: "deleteTag",
    handler: (req) => {
      const index = tags.findIndex((t) => t.id === req.id);
      if (index !== -1) {
        tags.splice(index, 1);
        // Also remove from feeds
        feeds.forEach((f) => {
          f.tags = f.tags.filter((t) => t.id !== req.id);
        });
        tags.forEach((t) => {
          const count = feeds.filter((f) =>
            f.tags.some((ft: Tag) => ft.id === t.id),
          ).length;
          t.feedCount = BigInt(count);
        });
      }
      return create(DeleteTagResponseSchema, {});
    },
  }),

  mockConnectWeb(FeedService)({
    method: "setFeedTags",
    handler: (req) => {
      const feed = feeds.find((f) => f.id === req.feedId);
      if (feed) {
        feed.tags = req.tagIds.map(
          (id) =>
            tags.find((t) => t.id === id) ||
            create(TagSchema, { id, name: "Unknown" }),
        );
        tags.forEach((t) => {
          const count = feeds.filter((f) =>
            f.tags.some((ft: Tag) => ft.id === t.id),
          ).length;
          t.feedCount = BigInt(count);
        });
      }
      return create(SetFeedTagsResponseSchema, {});
    },
  }),

  mockConnectWeb(FeedService)({
    method: "manageFeedTags",
    handler: (req) => {
      const addTagIds = req.addTagIds || [];
      const removeTagIds = req.removeTagIds || [];
      for (const feedId of req.feedIds || []) {
        const feed = feeds.find((f) => f.id === feedId);
        if (feed) {
          // Remove tags
          feed.tags = feed.tags.filter(
            (t: Tag) => !removeTagIds.includes(t.id),
          );
          // Add tags
          for (const tagId of addTagIds) {
            const tag = tags.find((t: Tag) => t.id === tagId);
            if (tag && !feed.tags.some((ft: Tag) => ft.id === tagId)) {
              feed.tags.push(tag);
            }
          }
        }
      }
      tags.forEach((t) => {
        const count = feeds.filter((f) =>
          f.tags.some((ft: Tag) => ft.id === t.id),
        ).length;
        t.feedCount = BigInt(count);
      });
      return create(ManageFeedTagsResponseSchema, {});
    },
  }),

  mockConnectWeb(FeedService)({
    method: "listFeedTags",
    handler: () => {
      const feedTags: { feedId: string; tagId: string }[] = [];
      for (const feed of feeds) {
        for (const tag of feed.tags) {
          feedTags.push({
            feedId: feed.id,
            tagId: tag.id,
          });
        }
      }
      return create(ListFeedTagsResponseSchema, { feedTags });
    },
  }),

  mockConnectWeb(ItemService)({
    method: "listItems",
    handler: (req) => {
      // Basic mock pagination: pageToken is the index
      const start = req.pageToken ? Number.parseInt(req.pageToken, 10) : 0;
      const pageSize = req.pageSize || 100;

      let filteredItems = items;

      if (req.since) {
        const sinceDate = timestampToDate(req.since);
        if (sinceDate) {
          filteredItems = items.filter((item) => {
            const createdAt = timestampToDate(item.createdAt);
            return createdAt && createdAt >= sinceDate;
          });
        }
      }

      const paginatedResults = filteredItems.slice(start, start + pageSize);
      const nextPageToken =
        filteredItems.length > start + pageSize
          ? (start + pageSize).toString()
          : "";

      return create(ListItemsResponseSchema, {
        items: paginatedResults,
        nextPageToken,
      });
    },
  }),

  mockConnectWeb(ItemService)({
    method: "updateItemStatus",
    handler: (req) => {
      const updatedAt = new Date("2026-03-01T00:00:00Z");
      for (const id of req.ids || []) {
        const item = items.find((i) => i.id === id);
        if (item) {
          if (req.isRead !== undefined) {
            item.isRead = req.isRead;
          }
        }
        if (req.isRead !== undefined) {
          itemReads.set(id, { isRead: req.isRead, updatedAt });
        }
      }
      return create(UpdateItemStatusResponseSchema, {});
    },
  }),

  mockConnectWeb(ItemService)({
    method: "getItem",
    handler: (req) => {
      const item = items.find((i) => i.id === req.id);
      if (item) {
        return create(GetItemResponseSchema, { item });
      }
      throw new Error("Item not found");
    },
  }),

  mockConnectWeb(ItemService)({
    method: "listItemRead",
    handler: (req) => {
      let results = Array.from(itemReads.entries()).map(([id, state]) => ({
        itemId: id,
        isRead: state.isRead,
        updatedAt: state.updatedAt,
      }));

      // Sort by updatedAt then itemId for consistent pagination
      results.sort((a, b) => {
        const timeDiff = a.updatedAt.getTime() - b.updatedAt.getTime();
        if (timeDiff !== 0) {
          return timeDiff;
        }
        return a.itemId.localeCompare(b.itemId);
      });

      if (req.pageToken) {
        // Simple mock pagination: the token is the index of the first item to return
        const start = Number.parseInt(req.pageToken, 10);
        results = results.slice(start);
      } else if (req.since) {
        const sinceDate = timestampToDate(req.since);
        if (sinceDate) {
          // Use strict ">" cursor to avoid repeatedly returning the last row.
          results = results.filter((r) => r.updatedAt > sinceDate);
        }
      }

      const pageSize = req.pageSize || 1000;
      const paginatedResults = results.slice(0, pageSize);
      const nextPageToken =
        results.length > pageSize
          ? (
              (req.pageToken ? Number.parseInt(req.pageToken, 10) : 0) +
              pageSize
            ).toString()
          : "";

      const itemReadsResponse = paginatedResults.map((r) => ({
        itemId: r.itemId,
        isRead: r.isRead,
        updatedAt: dateToTimestamp(r.updatedAt),
      }));

      return create(ListItemReadResponseSchema, {
        itemReads: itemReadsResponse,
        nextPageToken,
      });
    },
  }),

  mockConnectWeb(ItemService)({
    method: "listURLParsingRules",
    handler: () => {
      return create(ListURLParsingRulesResponseSchema, { rules: [] });
    },
  }),

  mockConnectWeb(ItemService)({
    method: "addURLParsingRule",
    handler: (req) => {
      if (req.ruleType !== "subdomain" && req.ruleType !== "path") {
        throw new Error(
          `invalid rule_type: ${req.ruleType}. Must be 'subdomain' or 'path'`,
        );
      }
      return create(AddURLParsingRuleResponseSchema, {
        rule: create(URLParsingRuleSchema, {
          id: Math.random().toString(36).substring(7),
          domain: req.domain,
          ruleType: req.ruleType,
          pattern: req.pattern,
        }),
      });
    },
  }),

  mockConnectWeb(ItemService)({
    method: "deleteURLParsingRule",
    handler: () => {
      return create(DeleteURLParsingRuleResponseSchema, {});
    },
  }),

  mockConnectWeb(ItemService)({
    method: "listItemBlockRules",
    handler: () => {
      return create(ListItemBlockRulesResponseSchema, { rules: [] });
    },
  }),

  mockConnectWeb(ItemService)({
    method: "addItemBlockRules",
    handler: (req) => {
      for (const [i, r] of req.rules.entries()) {
        if (
          !["user", "domain", "user_domain", "keyword"].includes(r.ruleType)
        ) {
          throw new Error(
            `invalid rule_type at index ${i}: ${r.ruleType}. Must be 'user', 'domain', 'user_domain', or 'keyword'`,
          );
        }
      }
      return create(AddItemBlockRulesResponseSchema, {});
    },
  }),

  mockConnectWeb(ItemService)({
    method: "deleteItemBlockRule",
    handler: () => {
      return create(DeleteItemBlockRuleResponseSchema, {});
    },
  }),
];

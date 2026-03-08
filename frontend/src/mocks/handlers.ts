import { create } from "@bufbuild/protobuf";
import {
  CreateFeedResponseSchema,
  DeleteFeedResponseSchema,
  type Feed,
  FeedSchema,
  FeedService,
  ListFeedSchema,
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
  type ItemBlockRule,
  ItemBlockRuleSchema,
  ItemSchema,
  ItemService,
  ListItemBlockRulesResponseSchema,
  ListItemReadResponseSchema,
  ListItemSchema,
  ListItemsResponseSchema,
  ListURLParsingRulesResponseSchema,
  UpdateItemStatusResponseSchema,
  type URLParsingRule,
  URLParsingRuleSchema,
} from "../gen/item/v1/item_pb";
import {
  CreateTagResponseSchema,
  DeleteTagResponseSchema,
  ListTagSchema,
  ListTagsResponseSchema,
  type Tag,
  TagSchema,
  TagService,
} from "../gen/tag/v1/tag_pb";
import { mockConnectWeb } from "./connect";

const tags: Tag[] = [];
const feeds: Feed[] = [];
const items: Item[] = [];
const itemReads = new Map<string, { isRead: boolean; updatedAt: Date }>();
const urlParsingRules: URLParsingRule[] = [];
const itemBlockRules: ItemBlockRule[] = [];

// Fixed date for consistent testing
const NOW = new Date("2026-03-08T10:00:00Z");

export const resetState = () => {
  tags.length = 0;
  itemReads.clear();
  tags.push(
    create(TagSchema, {
      id: "tag-1",
      name: "Tech",
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      unreadCount: 5n,
      feedCount: 1n,
    }),
    create(TagSchema, {
      id: "tag-2",
      name: "News",
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
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
      lastFetchedAt: NOW.toISOString(),
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      tags: [tags[0]],
    }),
    create(FeedSchema, {
      id: "2",
      url: "https://example.com/feed2.xml",
      link: "https://example.com/news",
      title: "Example Feed 2",
      lastFetchedAt: NOW.toISOString(),
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      tags: [tags[1]],
    }),
  );

  items.length = 0;
  for (let i = 0; i < 40; i++) {
    const id = (i + 1).toString();
    const date = new Date(NOW);
    if (i < 10) date.setHours(date.getHours() - i);
    else if (i < 20) date.setDate(date.getDate() - 2);
    else if (i < 30) date.setDate(date.getDate() - 10);
    else date.setDate(date.getDate() - 40);

    items.push(
      create(ItemSchema, {
        id,
        title: `Item ${id}`,
        publishedAt: date.toISOString(),
        createdAt: date.toISOString(),
        isRead: false,
        description: `<p>Full content for item ${id}</p>`,
        author: "Mock Author",
        url: `https://example.com/item${id}`,
      }),
    );
  }

  urlParsingRules.length = 0;
  urlParsingRules.push(
    create(URLParsingRuleSchema, {
      id: "rule-1",
      domain: "example.com",
      ruleType: "subdomain",
      pattern: "test",
    }),
    create(URLParsingRuleSchema, {
      id: "rule-2",
      domain: "test.com",
      ruleType: "path",
      pattern: "/abc",
    }),
  );

  itemBlockRules.length = 0;
  itemBlockRules.push(
    create(ItemBlockRuleSchema, {
      id: "block-1",
      ruleType: "keyword",
      value: "alice",
    }),
    create(ItemBlockRuleSchema, {
      id: "block-2",
      ruleType: "domain",
      value: "to-delete.com",
    }),
  );
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
      const listFeeds = filteredFeeds.map((feed) =>
        create(ListFeedSchema, {
          id: feed.id,
          url: feed.url,
          title: feed.title,
          unreadCount: feed.unreadCount ?? 0n,
          link: feed.link,
          lastFetchedAt: feed.lastFetchedAt,
          nextFetch: feed.nextFetch,
        }),
      );
      return create(ListFeedsResponseSchema, { feeds: listFeeds });
    },
  }),

  mockConnectWeb(FeedService)({
    method: "suspendFeeds",
    handler: (req) => {
      const nextFetch = new Date(
        Date.now() + Number(req.suspendSeconds) * 1000,
      ).toISOString();
      for (const id of req.ids || []) {
        const feed = feeds.find((f) => f.id === id);
        if (feed) {
          feed.nextFetch = nextFetch;
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
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
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
        feeds[index].updatedAt = NOW.toISOString();
        return create(UpdateFeedResponseSchema, { feed: feeds[index] });
      }
      throw new Error("Feed not found");
    },
  }),

  mockConnectWeb(FeedService)({
    method: "deleteFeed",
    handler: (req) => {
      const index = feeds.findIndex((f) => f.id === req.id);
      if (index !== -1) {
        feeds.splice(index, 1);
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
      const listTags = tags.map((tag) =>
        create(ListTagSchema, {
          id: tag.id,
          name: tag.name,
          unreadCount: tag.unreadCount ?? 0n,
          feedCount: tag.feedCount ?? 0n,
        }),
      );
      return create(ListTagsResponseSchema, { tags: listTags });
    },
  }),

  mockConnectWeb(TagService)({
    method: "createTag",
    handler: (req) => {
      const newTag = create(TagSchema, {
        id: crypto.randomUUID(),
        name: req.name,
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
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
      const offset = req.offset ?? 0;
      const limit = req.limit ?? 100;

      const filteredItems = items; // Disable filtering by since for test stability

      const totalCount = filteredItems.length;
      const resultItems = filteredItems
        .slice(offset, offset + limit)
        .map((item) =>
          create(ListItemSchema, {
            id: item.id,
            title: item.title,
            publishedAt: item.publishedAt,
            createdAt: item.createdAt,
            isRead: item.isRead,
            url: item.url,
          }),
        );

      return create(ListItemsResponseSchema, {
        items: resultItems,
        totalCount,
      });
    },
  }),

  mockConnectWeb(ItemService)({
    method: "updateItemStatus",
    handler: (req) => {
      const updatedAt = NOW;
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
      } else if (req.updatedSince) {
        const sinceDate = new Date(
          Number(req.updatedSince.seconds) * 1000 +
            req.updatedSince.nanos / 1000000,
        );
        // Use strict ">" cursor to avoid repeatedly returning the last row.
        results = results.filter((r) => r.updatedAt > sinceDate);
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
        updatedAt: {
          seconds: BigInt(Math.floor(r.updatedAt.getTime() / 1000)),
          nanos: (r.updatedAt.getTime() % 1000) * 1000000,
        },
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
      return create(ListURLParsingRulesResponseSchema, {
        rules: urlParsingRules,
      });
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
      const newRule = create(URLParsingRuleSchema, {
        id: Math.random().toString(36).substring(7),
        domain: req.domain,
        ruleType: req.ruleType,
        pattern: req.pattern,
      });
      urlParsingRules.push(newRule);
      return create(AddURLParsingRuleResponseSchema, {
        rule: newRule,
      });
    },
  }),

  mockConnectWeb(ItemService)({
    method: "deleteURLParsingRule",
    handler: (req) => {
      const index = urlParsingRules.findIndex((r) => r.id === req.id);
      if (index !== -1) {
        urlParsingRules.splice(index, 1);
      }
      return create(DeleteURLParsingRuleResponseSchema, {});
    },
  }),

  mockConnectWeb(ItemService)({
    method: "listItemBlockRules",
    handler: () => {
      return create(ListItemBlockRulesResponseSchema, {
        rules: itemBlockRules,
      });
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
        itemBlockRules.push(
          create(ItemBlockRuleSchema, {
            id: Math.random().toString(36).substring(7),
            ruleType: r.ruleType,
            value: r.value,
            domain: r.domain,
          }),
        );
      }
      return create(AddItemBlockRulesResponseSchema, {});
    },
  }),

  mockConnectWeb(ItemService)({
    method: "deleteItemBlockRule",
    handler: (req) => {
      const index = itemBlockRules.findIndex((r) => r.id === req.id);
      if (index !== -1) {
        itemBlockRules.splice(index, 1);
      }
      return create(DeleteItemBlockRuleResponseSchema, {});
    },
  }),
];

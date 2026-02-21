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
  GetItemResponseSchema,
  type Item,
  ItemSchema,
  ItemService,
  ListItemSchema,
  ListItemsResponseSchema,
  UpdateItemStatusResponseSchema,
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
import {
  BlockingRuleSchema,
  BlockingService,
  BulkCreateBlockingRulesResponseSchema,
  CreateBlockingRuleResponseSchema,
  CreateURLParsingRuleResponseSchema,
  DeleteBlockingRuleResponseSchema,
  DeleteURLParsingRuleResponseSchema,
  ListBlockingRulesResponseSchema,
  ListURLParsingRulesResponseSchema,
  ReevaluateAllItemsResponseSchema,
  type URLParsingRule,
  URLParsingRuleSchema,
} from "../gen/blocking/v1/blocking_pb";
import { mockConnectWeb } from "./connect";

const tags: Tag[] = [];
const feeds: Feed[] = [];
const items: Item[] = [];
const blockingRules: any[] = [];
const urlParsingRules: URLParsingRule[] = [];

export const resetState = () => {
  console.log("MSW: resetState called");
  tags.length = 0;
  tags.push(
    create(TagSchema, {
      id: "tag-1",
      name: "Tech",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unreadCount: 5n,
      feedCount: 1n,
    }),
    create(TagSchema, {
      id: "tag-2",
      name: "News",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      lastFetchedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [tags[0]],
    }),
    create(FeedSchema, {
      id: "2",
      url: "https://example.com/feed2.xml",
      link: "https://example.com/news",
      title: "Example Feed 2",
      lastFetchedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [tags[1]],
    }),
  );

  items.length = 0;
  for (let i = 0; i < 40; i++) {
    const id = (i + 1).toString();
    const date = new Date();
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

  blockingRules.length = 0;
  urlParsingRules.length = 0;
};

// Initial state
resetState();

export const handlers = [
  mockConnectWeb(FeedService)({
    method: "listFeeds",
    handler: (req) => {
      console.log("MSW: listFeeds called, count:", feeds.length);
      let filteredFeeds = feeds;
      // ... (rest of handlers remain same but with logging added to key ones)

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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        feeds[index].updatedAt = new Date().toISOString();
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

      let filteredItems = items;

      if (req.since) {
        const sinceDate = new Date(
          Number(req.since.seconds) * 1000 + req.since.nanos / 1000000,
        );
        filteredItems = items.filter(
          (item) => new Date(item.createdAt) >= sinceDate,
        );
      }

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
      for (const id of req.ids || []) {
        const item = items.find((i) => i.id === id);
        if (item) {
          if (req.isRead !== undefined) {
            item.isRead = req.isRead;
          }
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

  mockConnectWeb(BlockingService)({
    method: "listBlockingRules",
    handler: () => {
      return create(ListBlockingRulesResponseSchema, {
        rules: blockingRules.map((r) => create(BlockingRuleSchema, r)),
      });
    },
  }),

  mockConnectWeb(BlockingService)({
    method: "createBlockingRule",
    handler: (req) => {
      const newRule = {
        id: crypto.randomUUID(),
        ...req,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      blockingRules.push(newRule);
      return create(CreateBlockingRuleResponseSchema, {
        rule: create(BlockingRuleSchema, newRule),
      });
    },
  }),

  mockConnectWeb(BlockingService)({
    method: "bulkCreateBlockingRules",
    handler: (req) => {
      const newRules = (req.rules || []).map((r) => ({
        id: crypto.randomUUID(),
        ...r,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      blockingRules.push(...newRules);
      return create(BulkCreateBlockingRulesResponseSchema, {
        rules: newRules.map((r) => create(BlockingRuleSchema, r)),
      });
    },
  }),

  mockConnectWeb(BlockingService)({
    method: "deleteBlockingRule",
    handler: (req) => {
      const index = blockingRules.findIndex((r) => r.id === req.id);
      if (index !== -1) {
        blockingRules.splice(index, 1);
      }
      return create(DeleteBlockingRuleResponseSchema, {});
    },
  }),

  mockConnectWeb(BlockingService)({
    method: "listURLParsingRules",
    handler: () => {
      return create(ListURLParsingRulesResponseSchema, {
        rules: urlParsingRules.map((r) => create(URLParsingRuleSchema, r)),
      });
    },
  }),

  mockConnectWeb(BlockingService)({
    method: "createURLParsingRule",
    handler: (req) => {
      const newRule = create(URLParsingRuleSchema, {
        id: crypto.randomUUID(),
        domain: req.domain,
        pattern: req.pattern,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      urlParsingRules.push(newRule);
      return create(CreateURLParsingRuleResponseSchema, {
        rule: newRule,
      });
    },
  }),

  mockConnectWeb(BlockingService)({
    method: "deleteURLParsingRule",
    handler: (req) => {
      const index = urlParsingRules.findIndex((r) => r.id === req.id);
      if (index !== -1) {
        urlParsingRules.splice(index, 1);
      }
      return create(DeleteURLParsingRuleResponseSchema, {});
    },
  }),

  mockConnectWeb(BlockingService)({
    method: "reevaluateAllItems",
    handler: () => {
      return create(ReevaluateAllItemsResponseSchema, {});
    },
  }),
];

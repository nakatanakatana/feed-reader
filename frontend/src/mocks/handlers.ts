import { FeedService } from "../gen/feed/v1/feed_pb";
import { create } from "@bufbuild/protobuf";

import {
  CreateFeedResponseSchema,
  DeleteFeedResponseSchema,
  FeedSchema,
  ListFeedsResponseSchema,
  ManageFeedTagsResponseSchema,
  SetFeedTagsResponseSchema,
  UpdateFeedResponseSchema,
} from "../gen/feed/v1/feed_pb";

import type { Feed } from "../gen/feed/v1/feed_pb";

import { ItemService } from "../gen/item/v1/item_pb";

import {
  GetItemResponseSchema,
  ItemSchema,
  ListItemsResponseSchema,
  UpdateItemStatusResponseSchema,
} from "../gen/item/v1/item_pb";

import { TagService } from "../gen/tag/v1/tag_pb";

import {
  CreateTagResponseSchema,
  DeleteTagResponseSchema,
  ListTagsResponseSchema,
  TagSchema,
} from "../gen/tag/v1/tag_pb";

import type { Tag } from "../gen/tag/v1/tag_pb";
import { mockConnectWeb } from "./connect";

const tags: Tag[] = [
  create(TagSchema, {
    id: "tag-1",
    name: "Tech",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  create(TagSchema, {
    id: "tag-2",
    name: "News",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
];

const feeds: Feed[] = [
  create(FeedSchema, {
    id: "1",
    url: "https://example.com/feed1.xml",
    title: "Example Feed 1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [tags[0]],
  }),
  create(FeedSchema, {
    id: "2",
    url: "https://example.com/feed2.xml",
    title: "Example Feed 2",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [tags[1]],
  }),
];

export const handlers = [
  mockConnectWeb(FeedService)({
    method: "listFeeds",
    handler: (req) => {
      let filteredFeeds = feeds;
      if (req.tagId) {
        filteredFeeds = feeds.filter((f) =>
          f.tags.some((t) => t.id === req.tagId),
        );
      }
      return create(ListFeedsResponseSchema, { feeds: filteredFeeds });
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
        feeds[index].updatedAt = new Date().toISOString();
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
          feed.tags = feed.tags.filter((t) => !removeTagIds.includes(t.id));
          // Add tags
          for (const tagId of addTagIds) {
            const tag = tags.find((t) => t.id === tagId);
            if (tag && !feed.tags.some((ft) => ft.id === tagId)) {
              feed.tags.push(tag);
            }
          }
        }
      }
      return create(ManageFeedTagsResponseSchema, {});
    },
  }),

  mockConnectWeb(ItemService)({
    method: "listItems",
    handler: (req) => {
      const offset = req.offset ?? 0;
      const limit = req.limit ?? 20;

      // Mock items with different dates for testing the filter
      const allMockItems = Array.from({ length: 40 }, (_, i) => {
        const id = (i + 1).toString();
        const date = new Date();
        // Item 1-10: past 24h
        // Item 11-20: 2 days ago
        // Item 21-30: 10 days ago
        // Item 31-40: 40 days ago
        if (i < 10) date.setHours(date.getHours() - i);
        else if (i < 20) date.setDate(date.getDate() - 2);
        else if (i < 30) date.setDate(date.getDate() - 10);
        else date.setDate(date.getDate() - 40);

        return create(ItemSchema, {
          id,
          title: `Item ${id}`,
          url: `https://example.com/item/${id}`,
          publishedAt: date.toISOString(),
          isRead: false,
          feedId: req.feedId || "1",
        });
      });

      let filteredItems = allMockItems;

      if (req.publishedSince) {
        const sinceDate = new Date(
          Number(req.publishedSince.seconds) * 1000 +
            req.publishedSince.nanos / 1000000,
        );
        filteredItems = allMockItems.filter(
          (item) => new Date(item.publishedAt) >= sinceDate,
        );
      }

      if (req.feedId) {
        filteredItems = filteredItems.filter((item) => item.feedId === req.feedId);
      }

      const totalCount = filteredItems.length;
      const items = filteredItems.slice(offset, offset + limit);

      return create(ListItemsResponseSchema, { items, totalCount });
    },
  }),

  mockConnectWeb(ItemService)({
    method: "updateItemStatus",
    handler: () => {
      return create(UpdateItemStatusResponseSchema, {});
    },
  }),

  mockConnectWeb(ItemService)({
    method: "getItem",
    handler: (req) => {
      return create(GetItemResponseSchema, {
        item: create(ItemSchema, {
          id: req.id,
          title: `Detail for Item ${req.id}`,
          description: `<p>This is the full content for item ${req.id}. It includes <strong>HTML</strong> formatting.</p>`,
          publishedAt: new Date().toISOString(),
          author: "Mock Author",
          url: "https://example.com/mock-item",
          isRead: false,
        }),
      });
    },
  }),
];

import { mockConnectWeb } from "./connect";
import { FeedService } from "../gen/feed/v1/feed_connect";
import { ItemService } from "../gen/item/v1/item_connect";
import {
  ListFeedsResponse,
  CreateFeedResponse,
  DeleteFeedResponse,
  ListTagsResponse,
  CreateTagResponse,
  DeleteTagResponse,
  SetFeedTagsResponse,
  Tag,
  Feed,
} from "../gen/feed/v1/feed_pb";
import {
  Item,
  ListItemsResponse,
  UpdateItemStatusResponse,
  GetItemResponse,
} from "../gen/item/v1/item_pb";

const tags: Tag[] = [
  new Tag({
    id: "tag-1",
    name: "Tech",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  new Tag({
    id: "tag-2",
    name: "News",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
];

const feeds: Feed[] = [
  new Feed({
    uuid: "1",
    url: "https://example.com/feed1.xml",
    title: "Example Feed 1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [tags[0]],
  }),
  new Feed({
    uuid: "2",
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
          f.tags.some((t) => t.id === req.tagId)
        );
      }
      return new ListFeedsResponse({ feeds: filteredFeeds });
    },
  }),

  mockConnectWeb(FeedService)({
    method: "createFeed",
    handler: (req) => {
      const newFeed = new Feed({
        uuid: crypto.randomUUID(),
        url: req.url,
        title: req.title || "New Feed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: (req.tagIds || []).map(
          (id) => tags.find((t) => t.id === id) || new Tag({ id, name: "Unknown" })
        ),
      });
      // In-memory update for the session
      feeds.push(newFeed);
      return new CreateFeedResponse({ feed: newFeed });
    },
  }),

  mockConnectWeb(FeedService)({
    method: "updateFeed",
    handler: (req) => {
      const index = feeds.findIndex((f) => f.uuid === req.uuid);
      if (index !== -1) {
        if (req.title) feeds[index].title = req.title;
        if (req.tagIds) {
          feeds[index].tags = req.tagIds.map(
            (id) =>
              tags.find((t) => t.id === id) || new Tag({ id, name: "Unknown" })
          );
        }
        feeds[index].updatedAt = new Date().toISOString();
        return new CreateFeedResponse({ feed: feeds[index] });
      }
      throw new Error("Feed not found");
    },
  }),

  mockConnectWeb(FeedService)({
    method: "deleteFeed",
    handler: (req) => {
      const index = feeds.findIndex((f) => f.uuid === req.uuid);
      if (index !== -1) {
        feeds.splice(index, 1);
      }
      return new DeleteFeedResponse({});
    },
  }),

  mockConnectWeb(FeedService)({
    method: "listTags",
    handler: () => {
      return new ListTagsResponse({ tags });
    },
  }),

  mockConnectWeb(FeedService)({
    method: "createTag",
    handler: (req) => {
      const newTag = new Tag({
        id: crypto.randomUUID(),
        name: req.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      tags.push(newTag);
      return new CreateTagResponse({ tag: newTag });
    },
  }),

  mockConnectWeb(FeedService)({
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
      return new DeleteTagResponse({});
    },
  }),

  mockConnectWeb(FeedService)({
    method: "setFeedTags",
    handler: (req) => {
      const feed = feeds.find((f) => f.uuid === req.feedId);
      if (feed) {
        feed.tags = req.tagIds.map(
          (id) => tags.find((t) => t.id === id) || new Tag({ id, name: "Unknown" })
        );
      }
      return new SetFeedTagsResponse({});
    },
  }),

  mockConnectWeb(ItemService)({
    method: "listItems",
    handler: (req) => {
      const offset = req.offset ?? 0;
      const limit = req.limit ?? 20;

      if (offset >= 40) {
        return new ListItemsResponse({ items: [] });
      }
      const items = Array.from({ length: limit }, (_, i) => {
        const id = (offset + i + 1).toString();
        return new Item({
          id,
          title: `Item ${id}`,
          url: `https://example.com/item/${id}`,
          publishedAt: new Date().toISOString(),
          isRead: false,
          feedId: req.feedId || "1",
        });
      });
      return new ListItemsResponse({ items, totalCount: 40 });
    },
  }),

  mockConnectWeb(ItemService)({
    method: "updateItemStatus",
    handler: () => {
      return new UpdateItemStatusResponse({});
    },
  }),

  mockConnectWeb(ItemService)({
    method: "getItem",
    handler: (req) => {
      return new GetItemResponse({
        item: new Item({
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
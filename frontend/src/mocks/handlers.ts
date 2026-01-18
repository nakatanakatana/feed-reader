import { FeedService } from "../gen/feed/v1/feed_connect";
import {
  CreateFeedResponse,
  DeleteFeedResponse,
  ListFeedsResponse,
} from "../gen/feed/v1/feed_pb";
import { mockConnectWeb } from "./connect";

const feeds = [
  {
    uuid: "1",
    url: "https://example.com/feed1.xml",
    title: "Example Feed 1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uuid: "2",
    url: "https://example.com/feed2.xml",
    title: "Example Feed 2",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const handlers = [
  mockConnectWeb(FeedService)({
    method: "listFeeds",
    handler: () => {
      return new ListFeedsResponse({ feeds });
    },
  }),

  mockConnectWeb(FeedService)({
    method: "createFeed",
    handler: (req) => {
      const newFeed = {
        uuid: crypto.randomUUID(),
        url: req.url,
        title: req.title || "New Feed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // In-memory update for the session
      feeds.push(newFeed);
      return new CreateFeedResponse({ feed: newFeed });
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
];

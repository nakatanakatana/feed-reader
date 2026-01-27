import { createClient } from "@connectrpc/connect";
import { describe, expect, it } from "vitest";
import { toJson } from "@bufbuild/protobuf";
import {
  FeedService,
  ListFeedsResponseSchema,
  CreateFeedResponseSchema,
  DeleteFeedResponseSchema,
} from "../gen/feed/v1/feed_pb";
import { transport } from "../lib/query";

describe("FeedService Mock Handlers", () => {
  it("should mock ListFeeds", async () => {
    const client = createClient(FeedService, transport);
    const response = await client.listFeeds({});

    const data = toJson(ListFeedsResponseSchema, response);
    expect(data).toHaveProperty("feeds");
    expect(Array.isArray(response.feeds)).toBe(true);
    expect(response.feeds.length).toBeGreaterThan(0);
  });

  it("should mock CreateFeed", async () => {
    const feedData = {
      url: "https://example.com/feed.xml",
      title: "Example Feed",
    };

    const client = createClient(FeedService, transport);
    const response = await client.createFeed(feedData);

    const data = toJson(CreateFeedResponseSchema, response);
    expect(data).toHaveProperty("feed");
    expect(response.feed?.url).toBe(feedData.url);
    expect(response.feed?.title).toBe(feedData.title);
    expect(response.feed?.id).toBeDefined();
  });

  it("should mock DeleteFeed", async () => {
    // Get current feeds first
    const client = createClient(FeedService, transport);
    const listResponse = await client.listFeeds({});
    const idToDelete = listResponse.feeds[0].id;

    const response = await client.deleteFeed({ id: idToDelete });

    const data = toJson(DeleteFeedResponseSchema, response);
    expect(data).toEqual({});

    // Verify it's deleted
    const listResponseAfter = await client.listFeeds({});
    expect(
      listResponseAfter.feeds.find((f) => f.id === idToDelete),
    ).toBeUndefined();
  });
});

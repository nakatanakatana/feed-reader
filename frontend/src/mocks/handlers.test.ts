import { toJson } from "@bufbuild/protobuf";
import { createClient } from "@connectrpc/connect";
import { describe, expect, it } from "vitest";
import {
  DeleteFeedResponseSchema,
  FeedService,
  ListFeedsResponseSchema,
} from "../gen/feed/v1/feed_pb";
import { transport } from "../lib/query";
import { resetState } from "./handlers";

describe("FeedService Mock Handlers", () => {
  it("should mock ListFeeds", async () => {
    const client = createClient(FeedService, transport);
    const response = await client.listFeeds({});

    const data = toJson(ListFeedsResponseSchema, response);
    expect(data).toHaveProperty("feeds");
    expect(Array.isArray(response.feeds)).toBe(true);
    expect(response.feeds.length).toBe(2); // Initial state has 2 feeds
  });

  it("should mock CreateFeed", async () => {
    const feedData = {
      url: "https://example.com/new-feed.xml",
      title: "New Example Feed",
    };

    const client = createClient(FeedService, transport);
    const response = await client.createFeed(feedData);

    expect(response.feed?.url).toBe(feedData.url);

    const listResponse = await client.listFeeds({});
    expect(listResponse.feeds.length).toBe(3); // 2 initial + 1 new
  });

  it("should have reset state after the previous test (via vitest-setup.ts or manual call)", async () => {
    // In this test file, vitest-setup.ts should have called resetState() after the previous 'it' block.
    const client = createClient(FeedService, transport);
    const response = await client.listFeeds({});
    expect(response.feeds.length).toBe(2); // Should be back to 2
  });

  it("should manually reset state", async () => {
    const client = createClient(FeedService, transport);
    await client.createFeed({ url: "https://test.com" });
    let list = await client.listFeeds({});
    expect(list.feeds.length).toBe(3);

    resetState();
    list = await client.listFeeds({});
    expect(list.feeds.length).toBe(2);
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
    expect(listResponseAfter.feeds.length).toBe(1);
  });
});

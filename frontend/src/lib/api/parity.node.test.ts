import { describe, expect, it } from "vitest";
import {
  mapConnectItemBlockRule,
  mapConnectURLParsingRule,
  mapOpenAPIItemBlockRule,
  mapOpenAPIURLParsingRule,
} from "../block-db";
import { dateToTimestamp } from "../date-utils";
import { mapConnectFeed, mapOpenAPIFeed } from "../feed-db";
import { mapConnectItem, mapOpenAPIItem } from "../item-db";
import { mapConnectTag, mapOpenAPITag } from "../tag-db";
import {
  mapImportOpmlRequest,
  mapRefreshFeedsRequest,
  mapUpdateItemStatusRequest,
} from "./mutation-mappers";
import type { components } from "./types";

type OpenAPITag = components["schemas"]["Tag"];
type OpenAPIFeed = components["schemas"]["Feed"];
type OpenAPIItem = components["schemas"]["Item"];
type OpenAPIURLParsingRule = components["schemas"]["URLParsingRule"];
type OpenAPIItemBlockRule = components["schemas"]["ItemBlockRule"];

describe("OpenAPI read mappers", () => {
  it("preserves tag counts and timestamps", () => {
    const timestamp = "2026-03-01T00:00:00Z";
    const connectTag = {
      id: "tag-1",
      name: "Tech",
      createdAt: dateToTimestamp(new Date(timestamp)),
      updatedAt: dateToTimestamp(new Date(timestamp)),
      unreadCount: 5n,
      feedCount: 2n,
    };
    const openAPITag: OpenAPITag = {
      id: "tag-1",
      name: "Tech",
      createdAt: timestamp,
      updatedAt: timestamp,
      unreadCount: "5",
      feedCount: "2",
    };

    expect(mapOpenAPITag(openAPITag)).toEqual(mapConnectTag(connectTag));
  });

  it("preserves feed fields and missing optional timestamps", () => {
    const timestamp = "2026-03-01T00:00:00Z";
    const connectTag = {
      id: "tag-1",
      name: "Tech",
      createdAt: dateToTimestamp(new Date(timestamp)),
      updatedAt: dateToTimestamp(new Date(timestamp)),
      unreadCount: 0n,
      feedCount: 0n,
    };
    const connectFeed = {
      id: "feed-1",
      url: "https://example.com/feed.xml",
      title: "Example",
      createdAt: dateToTimestamp(new Date(timestamp)),
      updatedAt: dateToTimestamp(new Date(timestamp)),
      tags: [connectTag],
      unreadCount: 3n,
    };
    const openAPIFeed: OpenAPIFeed = {
      id: "feed-1",
      url: "https://example.com/feed.xml",
      title: "Example",
      createdAt: timestamp,
      updatedAt: timestamp,
      tags: [
        {
          id: "tag-1",
          name: "Tech",
          createdAt: timestamp,
          updatedAt: timestamp,
          unreadCount: "0",
          feedCount: "0",
        },
      ],
      unreadCount: "3",
    };

    expect(mapOpenAPIFeed(openAPIFeed)).toEqual(mapConnectFeed(connectFeed));
  });

  it("preserves item detail content fields", () => {
    const timestamp = "2026-03-01T00:00:00Z";
    const connectItem = {
      id: "item-1",
      url: "https://example.com/item",
      title: "Item",
      description: "Description",
      publishedAt: dateToTimestamp(new Date(timestamp)),
      feedId: "feed-1",
      isRead: false,
      author: "Author",
      content: "Content",
      imageUrl: "https://example.com/image.png",
      categories: "tech",
      createdAt: dateToTimestamp(new Date(timestamp)),
    };
    const openAPIItem: OpenAPIItem = {
      id: "item-1",
      url: "https://example.com/item",
      title: "Item",
      description: "Description",
      publishedAt: timestamp,
      feedId: "feed-1",
      isRead: false,
      author: "Author",
      content: "Content",
      imageUrl: "https://example.com/image.png",
      categories: "tech",
      createdAt: timestamp,
    };

    expect(mapOpenAPIItem(openAPIItem)).toEqual(mapConnectItem(connectItem));
  });
});

describe("OpenAPI mutation request mappers", () => {
  it("preserves feed refresh request shape", () => {
    const ids = ["feed-1", "feed-2"];

    expect(mapRefreshFeedsRequest(ids)).toEqual({ ids });
  });

  it("preserves item status bulk update request shape", () => {
    const ids = ["item-1", "item-2"];

    expect(mapUpdateItemStatusRequest(ids, true)).toEqual({
      ids,
      isRead: true,
    });
  });

  it("encodes OPML import bytes as OpenAPI byte strings", () => {
    const opmlContent = new TextEncoder().encode("<opml></opml>");

    expect(mapImportOpmlRequest(opmlContent)).toEqual({
      opmlContent: "PG9wbWw+PC9vcG1sPg==",
    });
  });
});

describe("OpenAPI rule mappers", () => {
  it("preserves URL parsing rule fields", () => {
    const connectRule = {
      id: "url-rule-1",
      domain: "example.com",
      ruleType: "subdomain",
      pattern: "example.com",
    };
    const openAPIRule: OpenAPIURLParsingRule = {
      id: "url-rule-1",
      domain: "example.com",
      ruleType: "subdomain",
      pattern: "example.com",
    };

    expect(mapOpenAPIURLParsingRule(openAPIRule)).toEqual(
      mapConnectURLParsingRule(connectRule),
    );
  });

  it("preserves item block rule optional domains", () => {
    const connectRule = {
      id: "block-rule-1",
      ruleType: "user_domain",
      value: "alice",
      domain: "example.com",
    };
    const openAPIRule: OpenAPIItemBlockRule = {
      id: "block-rule-1",
      ruleType: "user_domain",
      value: "alice",
      domain: "example.com",
    };

    expect(mapOpenAPIItemBlockRule(openAPIRule)).toEqual(
      mapConnectItemBlockRule(connectRule),
    );
  });
});

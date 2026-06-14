import { describe, expect, it } from "vitest";
import {
  buildItem,
  buildListItemsResponse,
  buildListTagsResponse,
  buildTag,
} from "./openapi-fixtures";

describe("openapi-fixtures", () => {
  it("buildListItemsResponse wraps items with empty nextPageToken", () => {
    const item = buildItem({ id: "1", title: "Example" });
    expect(buildListItemsResponse([item])).toEqual({
      items: [item],
      nextPageToken: "",
    });
  });

  it("buildListTagsResponse sums unread counts", () => {
    const tags = [
      buildTag({ id: "t1", name: "Tech", unreadCount: "5" }),
      buildTag({ id: "t2", name: "News", unreadCount: "3" }),
    ];
    expect(buildListTagsResponse(tags)).toEqual({
      tags,
      totalUnreadCount: "8",
    });
  });
});

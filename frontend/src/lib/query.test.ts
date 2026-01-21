import { describe, expect, it } from "vitest";
import * as queryLib from "./query";

describe("Query Setup", () => {
  it("should export a configured queryClient", () => {
    expect(queryLib.queryClient).toBeDefined();
  });

  it("should export a configured transport", () => {
    expect(queryLib.transport).toBeDefined();
  });

  it("should export a configured db client", () => {
    expect(queryLib.db).toBeDefined();
  });

  it("should export a configured feeds collection", () => {
    expect(queryLib.feedsCollection).toBeDefined();
  });

  it("should export useFeeds hook", () => {
    expect(queryLib.useFeeds).toBeDefined();
  });

  it("should have insert and delete on feeds collection", () => {
    expect(queryLib.db.feeds.insert).toBeDefined();
    expect(queryLib.db.feeds.delete).toBeDefined();
  });

  it("should have onInsert and onDelete handlers", () => {
    expect(queryLib.feedsCollection.config.onInsert).toBeDefined();
    expect(queryLib.feedsCollection.config.onDelete).toBeDefined();
  });
});

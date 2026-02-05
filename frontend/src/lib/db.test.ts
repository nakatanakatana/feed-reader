import { describe, expect, it } from "vitest";
import { db, feeds, localRead, tags } from "./db";

describe("db", () => {
  it("should be defined", () => {
    expect(db).toBeDefined();
  });

  it("should have feeds collection", () => {
    expect(db.feeds).toBeDefined();
    expect(feeds).toBeDefined();
  });

  it("should have tags collection", () => {
    expect(db.tags).toBeDefined();
    expect(tags).toBeDefined();
  });

  it("should have localRead collection", () => {
    expect(db.localRead).toBeDefined();
    expect(localRead).toBeDefined();
  });
});

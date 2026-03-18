import { describe, expect, it } from "vite-plus/test";

import { db, feeds, tags } from "./db";

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
});

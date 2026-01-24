import { describe, it, expect } from "vitest";
import { db, feeds, items } from "./db";

describe("db", () => {
  it("should be defined", () => {
    expect(db).toBeDefined();
  });

  it("should have feeds collection", () => {
    expect(db.feeds).toBeDefined();
    expect(feeds).toBeDefined();
  });

  it("should have items collection", () => {
    expect(db.items).toBeDefined();
    expect(items).toBeDefined();
  });
});

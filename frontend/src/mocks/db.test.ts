import { describe, it, expect, beforeEach } from "vitest";
import { db, resetDatabase } from "./db";

describe("Mock Database", () => {
  beforeEach(() => {
    resetDatabase();
  });

  it("initializes default tags on reset", () => {
    const tags = db.tag.getAll();
    expect(tags).toHaveLength(2);
    expect(tags[0].name).toBe("Tech");
  });

  it("can create and delete tags", () => {
    const tag = db.tag.create({
      id: "tag-test",
      name: "TestTag",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
      unreadCount: "0",
      feedCount: "0",
    });

    expect(db.tag.getAll()).toHaveLength(3);

    db.tag.delete({
      where: {
        id: {
          equals: tag.id,
        },
      },
    });

    expect(db.tag.getAll()).toHaveLength(2);
  });
});

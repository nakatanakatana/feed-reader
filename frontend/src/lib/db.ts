// Re-export all database modules

export * from "./feed-db";
export * from "./item-db";
export * from "./tag-db";

// Import for db object
import { feeds, feedTag } from "./feed-db";
import { tags } from "./tag-db";

// We still export a "db" object if we want to follow the spec's "Initialize the TanStack DB instance"
// even if it's just a collection of collections.
export const db = {
  feeds,
  feedTag,
  tags,
};

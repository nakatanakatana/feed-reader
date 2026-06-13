import type { TimestampLike } from "../lib/date-utils";

export const FeedSchema = {};
export const ListFeedsResponseSchema = {};
export const DeleteFeedResponseSchema = {};
export const ListFeedTagsResponseSchema = {};

export const ItemSchema = {};
export const GetItemResponseSchema = {};
export const ListItemsResponseSchema = {};
export const ListItemReadResponseSchema = {};
export const UpdateItemStatusResponseSchema = {};
export const URLParsingRuleSchema = {};
export const ListURLParsingRulesResponseSchema = {};
export const ItemBlockRuleSchema = {};
export const ListItemBlockRulesResponseSchema = {};
export const AddItemBlockRulesResponseSchema = {};

export const TagSchema = {};
export const ListTagsResponseSchema = {};

export const FeedService = {};
export const ItemService = {};
export const TagService = {};

const defaultDate = "2026-03-01T00:00:00.000Z";

export const create = <T>(schema: unknown, value: T): T => {
  if (schema === FeedSchema) {
    return {
      createdAt: defaultDate,
      updatedAt: defaultDate,
      tags: [],
      unreadCount: 0n,
      ...((value ?? {}) as object),
    } as T;
  }
  if (schema === TagSchema) {
    return {
      createdAt: defaultDate,
      updatedAt: defaultDate,
      unreadCount: 0n,
      feedCount: 0n,
      ...((value ?? {}) as object),
    } as T;
  }
  if (schema === ItemSchema) {
    return {
      title: "",
      isRead: false,
      ...((value ?? {}) as object),
    } as T;
  }
  return value;
};
export const toJson = <T>(_schema: unknown, value: T): T =>
  normalizeJson(value) as T;

const isTimestampLike = (value: unknown): value is TimestampLike =>
  typeof value === "object" &&
  value !== null &&
  "$typeName" in value &&
  (value as { $typeName?: unknown }).$typeName === "google.protobuf.Timestamp";

const normalizeJson = (value: unknown): unknown => {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (isTimestampLike(value)) {
    return new Date(
      Number(value.seconds) * 1000 + value.nanos / 1000000,
    ).toISOString();
  }
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeJson(entry)]),
    );
  }
  return value;
};

export type Tag = {
  id: string;
  name: string;
  createdAt?: string | TimestampLike;
  updatedAt?: string | TimestampLike;
  unreadCount?: bigint | string | number;
  feedCount?: bigint | string | number;
};

export type Feed = {
  id: string;
  url?: string;
  link?: string;
  title?: string;
  lastFetchedAt?: string | TimestampLike;
  nextFetchAt?: string | TimestampLike;
  createdAt?: string | TimestampLike;
  updatedAt?: string | TimestampLike;
  tags?: Tag[];
  unreadCount?: bigint | string | number;
};

export type Item = {
  id: string;
  url?: string;
  title?: string;
  description?: string;
  publishedAt?: string | TimestampLike;
  feedId?: string;
  isRead?: boolean;
  author?: string;
  content?: string;
  imageUrl?: string;
  categories?: string[];
  createdAt?: string | TimestampLike;
};

export type ItemRead = {
  itemId: string;
  isRead: boolean;
  updatedAt?: string | TimestampLike;
};

export type URLParsingRule = {
  id: string;
  domain: string;
  ruleType: string;
  pattern: string;
};

export type ItemBlockRule = {
  id: string;
  ruleType: string;
  value: string;
  domain?: string;
};

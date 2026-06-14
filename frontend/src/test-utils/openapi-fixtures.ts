import type {
  Feed,
  FeedTag,
  Item,
  ItemRead,
  ListFeedTagsResponse,
  ListFeedsResponse,
  ListItemReadResponse,
  ListItemsResponse,
  ListTagsResponse,
  Tag,
} from "../lib/api/types-generated";

const defaultDate = "2026-03-01T00:00:00.000Z";

export const buildItem = (
  overrides: Partial<Item> & Pick<Item, "id">,
): Item => ({
  url: "",
  title: "Untitled",
  description: "",
  publishedAt: defaultDate,
  feedId: "feed-1",
  isRead: false,
  author: "",
  content: "",
  imageUrl: "",
  categories: "",
  createdAt: defaultDate,
  ...overrides,
});

export const buildTag = (
  overrides: Partial<Tag> & Pick<Tag, "id" | "name">,
): Tag => ({
  createdAt: defaultDate,
  updatedAt: defaultDate,
  unreadCount: "0",
  feedCount: "0",
  ...overrides,
});

export const buildFeed = (
  overrides: Partial<Feed> & Pick<Feed, "id" | "title">,
): Feed => ({
  url: `https://example.com/${overrides.id}.xml`,
  createdAt: defaultDate,
  updatedAt: defaultDate,
  tags: [],
  unreadCount: "0",
  ...overrides,
});

export const buildListItemsResponse = (items: Item[]): ListItemsResponse => ({
  items,
  nextPageToken: "",
});

export const buildListTagsResponse = (tags: Tag[]): ListTagsResponse => ({
  tags,
  totalUnreadCount: tags
    .reduce((total, tag) => total + BigInt(tag.unreadCount), 0n)
    .toString(),
});

export const buildListFeedsResponse = (feeds: Feed[]): ListFeedsResponse => ({
  feeds,
});

export const buildListItemReadResponse = (
  itemReads: ItemRead[],
): ListItemReadResponse => ({
  itemReads,
  nextPageToken: "",
});

export const buildListFeedTagsResponse = (
  feedTags: FeedTag[] = [],
): ListFeedTagsResponse => ({
  feedTags,
});

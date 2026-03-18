import {
  coalesce,
  count,
  createLiveQueryCollection,
  eq,
  type InitialQueryBuilder,
} from "@tanstack/solid-db";
import { createMemo, createRoot } from "solid-js";
import { feedTag } from "../feed-db";
import { items } from "../item-db";
import { itemReadCollection } from "../item-read-db";
import { tags } from "../tag-db";

export interface TagUnreadCount {
  id: string;
  name: string;
  unreadCount: bigint;
}

interface ItemsWithReadStateOptions {
  // biome-ignore lint/suspicious/noExplicitAny: TanStack DB collection types are too strict for shared builders
  itemCollection?: any;
  // biome-ignore lint/suspicious/noExplicitAny: TanStack DB collection types are too strict for shared builders
  readCollection?: any;
  // biome-ignore lint/suspicious/noExplicitAny: TanStack DB collection types are too strict for shared builders
  feedTagCollection?: any;
  tagId?: string;
  itemId?: string;
  unreadOnly?: boolean;
}

interface TagUnreadCountsOptions {
  // biome-ignore lint/suspicious/noExplicitAny: TanStack DB collection types are too strict for shared builders
  tagsCollection?: any;
  // biome-ignore lint/suspicious/noExplicitAny: TanStack DB collection types are too strict for shared builders
  feedTagCollection?: any;
  // biome-ignore lint/suspicious/noExplicitAny: TanStack DB collection types are too strict for shared builders
  unreadItemsCollection?: any;
}

export const buildItemsWithReadStateQuery = (
  q: InitialQueryBuilder,
  options: ItemsWithReadStateOptions = {},
) => {
  const itemCollection = options.itemCollection ?? items();
  const readCollection = options.readCollection ?? itemReadCollection();
  const feedTagCollection = options.feedTagCollection ?? feedTag;

  let query = q
    .from({ item: itemCollection })
    // biome-ignore lint/suspicious/noExplicitAny: TanStack DB join types
    .leftJoin({ read: readCollection }, ({ item, read }: any) =>
      eq(item.id, read.id),
    );

  if (options.tagId) {
    query = query
      .innerJoin(
        { ft: feedTagCollection },
        // biome-ignore lint/suspicious/noExplicitAny: TanStack DB join types
        ({ item, ft }: any) => eq(item.feedId, ft.feedId),
      )
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB where types
      .where(({ ft }: any) => eq(ft.tagId, options.tagId));
  }

  if (options.itemId) {
    // biome-ignore lint/suspicious/noExplicitAny: TanStack DB where types
    query = query.where(({ item }: any) => eq(item.id, options.itemId));
  }

  if (options.unreadOnly) {
    // biome-ignore lint/suspicious/noExplicitAny: TanStack DB where types
    query = query.where(({ item, read }: any) =>
      eq(coalesce(read?.isRead, item.isRead), false),
    );
  }

  query = query
    // biome-ignore lint/suspicious/noExplicitAny: TanStack DB builder types are too loose here
    .orderBy(({ item }: any) => item.publishedAt, {
      direction: "asc",
      nulls: "last",
    })
    // biome-ignore lint/suspicious/noExplicitAny: TanStack DB builder types are too loose here
    .orderBy(({ item }: any) => item.createdAt, "asc");

  // biome-ignore lint/suspicious/noExplicitAny: TanStack DB select types
  return query.select(({ item, read }: any) => ({
    ...item,
    isRead: coalesce(read?.isRead, item.isRead),
  }));
};

export const itemsWithReadStateQuery = createRoot(() => {
  return createMemo(() =>
    createLiveQueryCollection((q) => buildItemsWithReadStateQuery(q)),
  );
});

export const itemsUnreadQuery = createRoot(() => {
  return createMemo(() =>
    createLiveQueryCollection((q) =>
      buildItemsWithReadStateQuery(q, { unreadOnly: true }),
    ),
  );
});

export const buildTagUnreadCountsQuery = (
  q: InitialQueryBuilder,
  options: TagUnreadCountsOptions = {},
) => {
  const tagsCollection = options.tagsCollection ?? tags;
  const feedTagCollection = options.feedTagCollection ?? feedTag;
  const unreadItemsCollection =
    options.unreadItemsCollection ?? itemsUnreadQuery();

  return (
    q
      .from({ tag: tagsCollection })
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB join types
      .leftJoin({ tf: feedTagCollection }, ({ tag, tf }: any) =>
        eq(tag.id, tf.tagId),
      )
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB join types
      .leftJoin({ i: unreadItemsCollection }, ({ tf, i }: any) =>
        eq(tf?.feedId, i.feedId),
      )
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB group/select types
      .groupBy(({ tag }: any) => [tag.id, tag.name])
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB select types
      .select(({ tag, i }: any) => ({
        id: tag.id,
        name: tag.name,
        unreadCount: count(i?.id),
      }))
  );
};

export const tagUnreadCountsQuery = createRoot(() => {
  return createMemo(() =>
    createLiveQueryCollection((q) => buildTagUnreadCountsQuery(q)),
  );
});

export const totalUnreadCountQuery = createRoot(() => {
  return createMemo(() =>
    createLiveQueryCollection((q) =>
      q
        .from({ i: itemsUnreadQuery() })
        .select(({ i }) => ({ total: count(i.id) })),
    ),
  );
});

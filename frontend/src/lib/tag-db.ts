import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import {
  count,
  createCollection,
  createLiveQueryCollection,
  eq,
} from "@tanstack/solid-db";
import type { ListTag } from "../gen/tag/v1/tag_pb";
import { TagService } from "../gen/tag/v1/tag_pb";
import { feedTag } from "./feed-db";
import { queryClient, transport } from "./query";

export interface Tag {
  id: string;
  name: string;
  unreadCount?: bigint;
}

const tagClient = createClient(TagService, transport);

export const tags = createCollection(
  queryCollectionOptions({
    id: "tags",
    queryClient,
    queryKey: ["tags"],
    queryFn: async () => {
      const response = await tagClient.listTags({});
      return response.tags.map((tag: ListTag) => ({
        id: tag.id,
        name: tag.name,
      }));
    },
    onInsert: async ({ transaction }) => {
      transaction.mutations.map(async (m) => {
        await tagClient.createTag({ name: m.modified.name });
      });
    },
    onDelete: async ({ transaction }) => {
      transaction.mutations.map(async (m) => {
        await tagClient.deleteTag({ id: m.modified.id });
      });
    },
    getKey: (tag: Tag) => tag.id,
  }),
);

export const tagsBaseQuery = createLiveQueryCollection((q) => {
  return q.from({ tag: tags }).select(({ tag }) => ({ ...tag }));
});

export const tagsFeedQuery = createLiveQueryCollection((q) =>
  q
    .from({ tag: tagsBaseQuery })
    .leftJoin({ ft: feedTag }, ({ tag, ft }) => eq(tag.id, ft.tagId))
    .groupBy(({ tag }) => [tag.id, tag.name])
    .select(({ tag, ft }) => ({
      id: tag.id,
      name: tag.name,
      feedCount: count(ft?.feedId),
    })),
);

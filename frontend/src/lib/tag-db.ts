import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/solid-db";
import { TagService } from "../gen/tag/v1/tag_pb";
import { toDate } from "./date-utils";
import { queryClient, transport } from "./query";

export interface Tag {
  id: string;
  name: string;
  unreadCount?: bigint;
  feedCount?: bigint;
  createdAt?: Date;
  updatedAt?: Date;
}

const tagClient = createClient(TagService, transport);

export const tags = createCollection(
  queryCollectionOptions({
    id: "tags",
    queryClient,
    queryKey: ["tags"],
    queryFn: async () => {
      const response = await tagClient.listTags({});
      return response.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        unreadCount: tag.unreadCount,
        feedCount: tag.feedCount,
        createdAt: toDate(tag.createdAt),
        updatedAt: toDate(tag.updatedAt),
      }));
    },
    onInsert: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map(async (m) => {
          await tagClient.createTag({ name: m.modified.name });
        }),
      );
    },
    onDelete: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map(async (m) => {
          await tagClient.deleteTag({ id: m.modified.id });
        }),
      );
    },
    getKey: (tag: Tag) => tag.id,
  }),
);

import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import {
  createCollection,
  createLiveQueryCollection,
} from "@tanstack/solid-db";
import type { ListTag } from "../gen/tag/v1/tag_pb";
import { TagService } from "../gen/tag/v1/tag_pb";
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
        unreadCount: tag.unreadCount,
      }));
    },
    getKey: (tag: Tag) => tag.id,
  }),
);

export const tagsQuery = createLiveQueryCollection((q) => {
  return q.from({ tag: tags }).select(({ tag }) => ({ ...tag }));
});

export const createTag = async (name: string) => {
  await tagClient.createTag({ name });
  queryClient.invalidateQueries({ queryKey: ["tags"] });
};

export const deleteTag = async (id: string) => {
  await tagClient.deleteTag({ id });
  queryClient.invalidateQueries({ queryKey: ["tags"] });
  queryClient.invalidateQueries({ queryKey: ["feeds"] });
};

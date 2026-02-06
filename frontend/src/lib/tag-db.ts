import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/solid-db";
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

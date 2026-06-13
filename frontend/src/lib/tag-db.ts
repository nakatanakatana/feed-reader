import { createClient } from "@connectrpc/connect";
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

export const tagsQueryOptions = {
  queryKey: ["tags"] as const,
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
};

export const tagInsert = async (name: string) => {
  await tagClient.createTag({ name });
  await queryClient.invalidateQueries({ queryKey: ["tags"] });
};

export const tagDelete = async (id: string) => {
  await tagClient.deleteTag({ id });
  await queryClient.invalidateQueries({ queryKey: ["tags"] });
};

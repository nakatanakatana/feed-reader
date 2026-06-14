import { tagsCreate } from "./api/generated/client/tagsCreate.ts";
import { tagsDelete } from "./api/generated/client/tagsDelete.ts";
import { tagsList } from "./api/generated/client/tagsList.ts";
import type { components } from "./api/types";
import { type TimestampLike, toDate } from "./date-utils";
import { queryClient } from "./query";

export interface Tag {
  id: string;
  name: string;
  unreadCount?: bigint;
  feedCount?: bigint;
  createdAt?: Date;
  updatedAt?: Date;
}

type OpenAPITag = components["schemas"]["Tag"];

export interface ConnectTagShape {
  id: string;
  name: string;
  unreadCount: bigint;
  feedCount: bigint;
  createdAt?: Date | TimestampLike | string;
  updatedAt?: Date | TimestampLike | string;
}

export const mapConnectTag = (tag: ConnectTagShape): Tag => ({
  id: tag.id,
  name: tag.name,
  unreadCount: tag.unreadCount,
  feedCount: tag.feedCount,
  createdAt: toDate(tag.createdAt),
  updatedAt: toDate(tag.updatedAt),
});

export const mapOpenAPITag = (tag: OpenAPITag): Tag => ({
  id: tag.id,
  name: tag.name,
  unreadCount: BigInt(tag.unreadCount),
  feedCount: BigInt(tag.feedCount),
  createdAt: toDate(tag.createdAt),
  updatedAt: toDate(tag.updatedAt),
});

export const tagsQueryOptions = {
  queryKey: ["tags"] as const,
  queryFn: async () => {
    const response = await tagsList();
    return response.tags.map(mapOpenAPITag);
  },
};

export const tagInsert = async (name: string) => {
  await tagsCreate({ name });
  await queryClient.invalidateQueries({ queryKey: ["tags"] });
};

export const tagDelete = async (id: string) => {
  await tagsDelete(id);
  await queryClient.invalidateQueries({ queryKey: ["tags"] });
};

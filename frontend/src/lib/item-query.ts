import type { Transport } from "@connectrpc/connect";
import { createClient } from "@connectrpc/connect";
import {
  createInfiniteQuery,
  infiniteQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/solid-query";
import { ItemService } from "../gen/item/v1/item_pb";
import { ListItemsRequest_SortOrder } from "../gen/item/v1/item_pb";
import { useTransport } from "./transport-context";
import type { Timestamp } from "@bufbuild/protobuf";

import { createLiveQueryCollection } from "@tanstack/db";
import { db } from "./db";

const serializeForQueryKey = (obj: Record<string, unknown>) => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (
      value &&
      typeof value === "object" &&
      "seconds" in value &&
      typeof (value as { seconds: unknown }).seconds === "bigint"
    ) {
      result[key] = {
        ...value,
        seconds: (value as { seconds: bigint }).seconds.toString(),
      };
    } else {
      result[key] = value;
    }
  }
  return result;
};

export const itemKeys = {
  all: ["items"] as const,
  list: (filters: Record<string, unknown>) =>
    [...itemKeys.all, "list", serializeForQueryKey(filters)] as const,
  detail: (id: string) => [...itemKeys.all, "detail", id] as const,
};

export interface FetchItemsParams {
  feedId?: string;
  isRead?: boolean;
  tagId?: string;
  publishedSince?: Timestamp;
  limit?: number;
  offset?: number;
  sortOrder?: ListItemsRequest_SortOrder;
}

export const fetchItems = async (
  transport: Transport,
  params: FetchItemsParams,
) => {
  const client = createClient(ItemService, transport);
  return await client.listItems({
    feedId: params.feedId,
    isRead: params.isRead,
    tagId: params.tagId,
    publishedSince: params.publishedSince,
    limit: params.limit,
    offset: params.offset,
    sortOrder: params.sortOrder ?? ListItemsRequest_SortOrder.UNSPECIFIED,
  });
};

export const fetchItem = async (transport: Transport, id: string) => {
  const client = createClient(ItemService, transport);
  const response = await client.getItem({ id });
  return response.item;
};

const LAST_FETCHED_AT_KEY = "feed-reader-last-fetched-at";

export const fetchNewItems = async (
  transport: Transport,
  params: {
    feedId?: string;
    lastFetchedAt?: string;
    tagId?: string;
  },
) => {
  const lastFetchedAt =
    params.lastFetchedAt ||
    localStorage.getItem(LAST_FETCHED_AT_KEY) ||
    new Date(0).toISOString();
  const lastFetchedDate = new Date(lastFetchedAt);
  const publishedSince = {
    seconds: BigInt(Math.floor(lastFetchedDate.getTime() / 1000)),
    nanos: (lastFetchedDate.getTime() % 1000) * 1000000,
  } as Timestamp;

  const result = await fetchItems(transport, {
    feedId: params.feedId,
    tagId: params.tagId,
    publishedSince,
    sortOrder: ListItemsRequest_SortOrder.ASC,
  });

  if (result.items.length > 0) {
    localStorage.setItem(LAST_FETCHED_AT_KEY, new Date().toISOString());
  }

  return result;
};

export const fetchOlderItems = async (
  transport: Transport,
  params: {
    feedId?: string;
    tagId?: string;
    isRead?: boolean;
    offset: number;
    limit?: number;
  },
) => {
  return fetchItems(transport, {
    feedId: params.feedId,
    tagId: params.tagId,
    isRead: params.isRead,
    offset: params.offset,
    limit: params.limit ?? 20,
    sortOrder: ListItemsRequest_SortOrder.ASC,
  });
};

export const getMergedItemsQuery = () => {
  return createLiveQueryCollection((q) =>
    q.from({ items: db.items }).orderBy(({ items }) => items.createdAt, "asc"),
  );
};

export const itemsInfiniteQueryOptions = (
  transport: Transport,
  params: Omit<FetchItemsParams, "limit" | "offset">,
) => {
  return infiniteQueryOptions({
    queryKey: itemKeys.list(params),
    queryFn: async ({ pageParam }) => {
      const result = await fetchItems(transport, {
        ...params,
        limit: 20,
        offset: pageParam as number,
      });

      // Side effect: populate the central items collection for LiveQueries
      for (const item of result.items) {
        const mapped = {
          id: item.id,
          url: item.url,
          title: item.title,
          description: item.description,
          publishedAt: item.publishedAt,
          author: item.author,
          feedId: item.feedId,
          isRead: item.isRead,
          createdAt: item.createdAt,
          updatedAt: item.createdAt, // Fallback
        };
        if (db.items.has(item.id)) {
          db.items.update(item.id, (draft) => {
            Object.assign(draft, mapped);
          });
        } else {
          db.items.insert(mapped);
        }
      }

      return result;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.items.length === 0) {
        return undefined;
      }
      return (lastPageParam as number) + 20;
    },
  });
};

export const useItems = (
  params:
    | Omit<FetchItemsParams, "limit" | "offset">
    | (() => Omit<FetchItemsParams, "limit" | "offset">),
) => {
  const transport = useTransport();
  return createInfiniteQuery(() => {
    const p =
      typeof params === "function"
        ? (params as () => Omit<FetchItemsParams, "limit" | "offset">)()
        : params;
    return itemsInfiniteQueryOptions(transport, p);
  });
};

export const useItem = (id: () => string | undefined) => {
  const transport = useTransport();
  return useQuery(() => ({
    queryKey: itemKeys.detail(id() ?? ""),
    queryFn: async () => {
      const currentId = id();
      if (!currentId) throw new Error("Item ID is required");
      return fetchItem(transport, currentId);
    },
    enabled: !!id(),
  }));
};

export interface UpdateItemStatusParams {
  ids: string[];
  isRead?: boolean;
}

export const updateItemStatus = async (
  transport: Transport,
  params: UpdateItemStatusParams,
) => {
  const client = createClient(ItemService, transport);
  return await client.updateItemStatus({
    ids: params.ids,
    isRead: params.isRead,
  });
};

export const useUpdateItemStatus = () => {
  const transport = useTransport();
  const queryClient = useQueryClient();

  return useMutation(() => ({
    mutationFn: (params: UpdateItemStatusParams) =>
      updateItemStatus(transport, params),
    onSuccess: () => {
      // Invalidate both items and merged list
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
    },
  }));
};

import type { Timestamp } from "@bufbuild/protobuf/wkt";
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
import { useTransport } from "./transport-context";

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
  since?: Timestamp;
  limit?: number;
  offset?: number;
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
    since: params.since,
    limit: params.limit,
    offset: params.offset,
  });
};

export const fetchItem = async (transport: Transport, id: string) => {
  const client = createClient(ItemService, transport);
  const response = await client.getItem({ id });
  return response.item;
};

export const itemsInfiniteQueryOptions = (
  transport: Transport,
  params: Omit<FetchItemsParams, "limit" | "offset">,
) => {
  return infiniteQueryOptions({
    queryKey: itemKeys.list(params),
    queryFn: async ({ pageParam }) => {
      return fetchItems(transport, {
        ...params,
        limit: 100,
        offset: pageParam as number,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.items.length === 0) {
        return undefined;
      }
      return (lastPageParam as number) + 100;
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
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
    },
  }));
};

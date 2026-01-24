import type { Transport } from "@connectrpc/connect";
import { createClient } from "@connectrpc/connect";
import {
  createInfiniteQuery,
  createMutation,
  createQuery,
  infiniteQueryOptions,
  useQueryClient,
} from "@tanstack/solid-query";
import { ItemService } from "../gen/item/v1/item_connect";
import { ListItemsRequest_SortOrder } from "../gen/item/v1/item_pb";
import { useTransport } from "./transport-context";

export const itemKeys = {
  all: ["items"] as const,
  list: (filters: Record<string, unknown>) =>
    [...itemKeys.all, "list", filters] as const,
  detail: (id: string) => [...itemKeys.all, "detail", id] as const,
};

export interface FetchItemsParams {
  feedId?: string;
  isRead?: boolean;
  isSaved?: boolean;
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
    isSaved: params.isSaved,
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

export const itemsInfiniteQueryOptions = (
  transport: Transport,
  params: Omit<FetchItemsParams, "limit" | "offset">,
) => {
  return infiniteQueryOptions({
    queryKey: itemKeys.list(params),
    queryFn: async ({ pageParam }) => {
      return fetchItems(transport, {
        ...params,
        limit: 20,
        offset: pageParam as number,
      });
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
  params: Omit<FetchItemsParams, "limit" | "offset">,
) => {
  const transport = useTransport();
  return createInfiniteQuery(() =>
    itemsInfiniteQueryOptions(transport, params),
  );
};

export const useItem = (id: () => string | undefined) => {
  const transport = useTransport();
  return createQuery(() => ({
    queryKey: itemKeys.detail(id() ?? ""),
    queryFn: () => fetchItem(transport, id()!),
    enabled: !!id(),
  }));
};

export interface UpdateItemStatusParams {
  ids: string[];
  isRead?: boolean;
  isSaved?: boolean;
}

export const updateItemStatus = async (
  transport: Transport,
  params: UpdateItemStatusParams,
) => {
  const client = createClient(ItemService, transport);
  return await client.updateItemStatus({
    ids: params.ids,
    isRead: params.isRead,
    isSaved: params.isSaved,
  });
};

export const useUpdateItemStatus = () => {
  const transport = useTransport();
  const queryClient = useQueryClient();

  return createMutation(() => ({
    mutationFn: (params: UpdateItemStatusParams) =>
      updateItemStatus(transport, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
    },
  }));
};

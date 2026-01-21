import { createClient } from "@connectrpc/connect";
import type { Transport } from "@connectrpc/connect";
import { ItemService } from "../gen/item/v1/item_connect";
import { ListItemsRequest_SortOrder } from "../gen/item/v1/item_pb";

export const itemKeys = {
  all: ["items"] as const,
  list: (filters: Record<string, any>) => [...itemKeys.all, "list", filters] as const,
};

export interface FetchItemsParams {
  feedId?: string;
  isRead?: boolean;
  isSaved?: boolean;
  limit?: number;
  offset?: number;
  sortOrder?: ListItemsRequest_SortOrder;
}

export const fetchItems = async (transport: Transport, params: FetchItemsParams) => {
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

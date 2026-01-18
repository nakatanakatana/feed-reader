import { createClient } from "@connectrpc/connect";
import {
  createInfiniteQuery,
  createMutation,
  createQuery,
  useQueryClient,
} from "@tanstack/solid-query";
import { FeedService } from "../gen/feed/v1/feed_connect";
import { useTransport } from "./transport-context";

export function useItems(options: { feedId?: string; unreadOnly?: boolean }) {
  const transport = useTransport();
  const client = createClient(FeedService, transport);

  return createInfiniteQuery(() => ({
    queryKey: ["items", options.feedId, options.unreadOnly],
    queryFn: async ({ pageParam }) => {
      if (options.feedId) {
        return await client.listFeedItems({
          feedId: options.feedId,
          pageSize: 20,
          pageToken: pageParam as string,
          unreadOnly: options.unreadOnly,
        });
      }
      return await client.listGlobalItems({
        pageSize: 20,
        pageToken: pageParam as string,
        unreadOnly: options.unreadOnly,
      });
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextPageToken || undefined,
  }));
}

export function useItem(id: () => string | undefined) {
  const transport = useTransport();
  const client = createClient(FeedService, transport);

  return createQuery(() => ({
    queryKey: ["item", id()],
    queryFn: async () => {
      const itemId = id();
      if (!itemId) throw new Error("Item ID is required");
      const res = await client.getItem({ id: itemId });
      return res.item;
    },
    enabled: !!id(),
  }));
}

export function useMarkItemRead() {
  const transport = useTransport();
  const client = createClient(FeedService, transport);
  const queryClient = useQueryClient();

  return createMutation(() => ({
    mutationFn: async (id: string) => {
      await client.markItemRead({ id });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["item", id] });
    },
  }));
}

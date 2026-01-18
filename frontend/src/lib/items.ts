import { createClient } from "@connectrpc/connect";
import {
  createInfiniteQuery,
  createMutation,
  createQuery,
  useQueryClient,
} from "@tanstack/solid-query";
import { FeedService } from "../gen/feed/v1/feed_connect";
import { useTransport } from "./transport-context";

export function useItems(
  feedId: () => string | undefined,
  unreadOnly: () => boolean,
) {
  const transport = useTransport();
  const client = createClient(FeedService, transport);

  return createInfiniteQuery(() => ({
    queryKey: ["items", feedId(), unreadOnly()],
    queryFn: async ({ pageParam }) => {
      const currentFeedId = feedId();
      const currentUnreadOnly = unreadOnly();

      if (currentFeedId) {
        return await client.listFeedItems({
          feedId: currentFeedId,
          pageSize: 20,
          pageToken: pageParam as string,
          unreadOnly: currentUnreadOnly,
        });
      }
      return await client.listGlobalItems({
        pageSize: 20,
        pageToken: pageParam as string,
        unreadOnly: currentUnreadOnly,
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

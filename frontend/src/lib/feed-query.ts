import { createClient } from "@connectrpc/connect";
import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { FeedService } from "../gen/feed/v1/feed_pb";
import type { ManageFeedTagsRequest, RefreshFeedsRequest } from "../gen/feed/v1/feed_pb";
import { transport } from "./query";

const client = createClient(FeedService, transport);

export function useManageFeedTags() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (req: ManageFeedTagsRequest) => client.manageFeedTags(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] });
      // Also might need to invalidate tags if we think they changed, but manage tags only changes associations
    },
  }));
}

export function useRefreshFeeds() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (req: RefreshFeedsRequest) => client.refreshFeeds(req),
    onSuccess: () => {
      // Invalidate feeds, items, and tags as counts might have changed
      queryClient.invalidateQueries({ queryKey: ["feeds"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  }));
}

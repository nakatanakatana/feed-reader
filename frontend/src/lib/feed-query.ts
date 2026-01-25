import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { FeedService } from "../gen/feed/v1/feed_connect";
import type { ManageFeedTagsRequest } from "../gen/feed/v1/feed_pb";
import { transport } from "./query";
import { createClient } from "@connectrpc/connect";

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

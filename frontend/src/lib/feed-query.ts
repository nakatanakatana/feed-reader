import type { PartialMessage } from "@bufbuild/protobuf";
import { createClient } from "@connectrpc/connect";
import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { FeedService } from "../gen/feed/v1/feed_connect";
import type { ManageFeedTagsRequest } from "../gen/feed/v1/feed_pb";
import { transport } from "./query";

const client = createClient(FeedService, transport);

export function useManageFeedTags() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (req: PartialMessage<ManageFeedTagsRequest>) =>
      client.manageFeedTags(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] });
      // Also might need to invalidate tags if we think they changed, but manage tags only changes associations
    },
  }));
}

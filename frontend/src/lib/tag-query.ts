import {
  createMutation,
  createQuery,
  useQueryClient,
} from "@tanstack/solid-query";
import { FeedService } from "../gen/feed/v1/feed_connect";
import type {
  CreateTagRequest,
  DeleteTagRequest,
} from "../gen/feed/v1/feed_pb";
import { transport } from "./query";
import { createPromiseClient } from "@connectrpc/connect";

const client = createPromiseClient(FeedService, transport);

export const tagKeys = {
  all: ["tags"] as const,
};

export function useTags() {
  return createQuery(() => ({
    queryKey: tagKeys.all,
    queryFn: () => client.listTags({}),
  }));
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return createMutation(() => ({
    mutationFn: (req: CreateTagRequest) => client.createTag(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
  }));
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return createMutation(() => ({
    mutationFn: (req: DeleteTagRequest) => client.deleteTag(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      queryClient.invalidateQueries({ queryKey: ["feeds"] });
    },
  }));
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import { TagService } from "../gen/tag/v1/tag_connect";
import type { CreateTagRequest, DeleteTagRequest } from "../gen/tag/v1/tag_pb";
import { transport } from "./query";
import { createClient } from "@connectrpc/connect";

const client = createClient(TagService, transport);

export const tagKeys = {
  all: ["tags"] as const,
};

export function useTags() {
  return useQuery(() => ({
    queryKey: tagKeys.all,
    queryFn: () => client.listTags({}),
  }));
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (req: CreateTagRequest) => client.createTag(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
  }));
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (req: DeleteTagRequest) => client.deleteTag(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      queryClient.invalidateQueries({ queryKey: ["feeds"] });
    },
  }));
}

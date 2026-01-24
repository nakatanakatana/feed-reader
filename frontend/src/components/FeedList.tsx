import { createClient } from "@connectrpc/connect";
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import { Link } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { FeedService } from "../gen/feed/v1/feed_connect";
import { useTransport } from "../lib/transport-context";

export function FeedList() {
  const transport = useTransport();
  const client = createClient(FeedService, transport);
  const queryClient = useQueryClient();

  const query = useQuery(() => ({
    queryKey: ["feeds"],
    queryFn: async () => {
      const response = await client.listFeeds({});
      return response.feeds;
    },
  }));

  const deleteMutation = useMutation(() => ({
    mutationFn: async (uuid: string) => {
      await client.deleteFeed({ uuid });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] });
    },
  }));

  return (
    <div class={stack({ gap: "4" })}>
      <h2 class={css({ fontSize: "xl", fontWeight: "semibold" })}>
        Your Feeds
      </h2>
      <Show when={query.isLoading}>
        <p>Loading...</p>
      </Show>
      <Show when={query.isError}>
        <p class={css({ color: "red.500" })}>Error: {query.error?.message}</p>
      </Show>
      <Show when={deleteMutation.isError}>
        <p class={css({ color: "red.500" })}>
          Delete Error: {deleteMutation.error?.message}
        </p>
      </Show>
      <ul class={stack({ gap: "2" })}>
        <For each={query.data}>
          {(feed) => (
            <li
              class={flex({
                justifyContent: "space-between",
                alignItems: "center",
                padding: "3",
                border: "1px solid",
                borderColor: "gray.100",
                borderRadius: "md",
                _hover: { backgroundColor: "gray.50" },
              })}
            >
              <div class={stack({ gap: "0" })}>
                <Link
                  to="/feeds/$feedId"
                  params={{ feedId: feed.uuid }}
                  class={css({
                    fontWeight: "medium",
                    _hover: { textDecoration: "underline", color: "blue.600" },
                  })}
                >
                  {feed.title || "Untitled Feed"}
                </Link>
                <span class={css({ fontSize: "xs", color: "gray.500" })}>
                  {feed.url}
                </span>
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(feed.uuid)}
                disabled={deleteMutation.isPending}
                class={css({
                  color: "red.500",
                  padding: "1",
                  paddingInline: "2",
                  borderRadius: "md",
                  fontSize: "sm",
                  cursor: "pointer",
                  _hover: {
                    backgroundColor: "red.50",
                    textDecoration: "underline",
                  },
                  _disabled: { color: "gray.400", cursor: "not-allowed" },
                })}
              >
                Delete
              </button>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}

import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query';
import { createPromiseClient } from '@connectrpc/connect';
import { FeedService } from '../gen/feed/v1/feed_connect';
import { useTransport } from '../lib/transport-context';
import { For, Show } from 'solid-js';

export function FeedList() {
  const transport = useTransport();
  const client = createPromiseClient(FeedService, transport);
  const queryClient = useQueryClient();

  const query = createQuery(() => ({
    queryKey: ['feeds'],
    queryFn: async () => {
      const response = await client.listFeeds({});
      return response.feeds;
    },
  }));

  const deleteMutation = createMutation(() => ({
    mutationFn: async (uuid: string) => {
      await client.deleteFeed({ uuid });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
  }));

  return (
    <div>
      <h2>Feeds</h2>
      <Show when={query.isLoading}>
        <p>Loading...</p>
      </Show>
      <Show when={query.isError}>
        <p>Error: {query.error?.message}</p>
      </Show>
      <Show when={deleteMutation.isError}>
        <p>Delete Error: {deleteMutation.error?.message}</p>
      </Show>
      <ul>
        <For each={query.data}>
          {(feed) => (
            <li>
              <a href={feed.url} target="_blank">{feed.title || feed.url}</a>
              <button 
                onClick={() => deleteMutation.mutate(feed.uuid)}
                disabled={deleteMutation.isPending}
                style={{ "margin-left": "10px" }}
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
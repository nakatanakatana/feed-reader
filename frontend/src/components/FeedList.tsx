import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query';
import { createPromiseClient } from '@connectrpc/connect';
import { FeedService } from '../gen/feed/v1/feed_connect';
import { useTransport } from '../lib/transport-context';
import { For, Show } from 'solid-js';
import { css } from '../../styled-system/css';
import { stack, flex } from '../../styled-system/patterns';

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
    <div class={stack({ gap: '4' })}>
      <h2 class={css({ fontSize: 'xl', fontWeight: 'semibold' })}>Your Feeds</h2>
      <Show when={query.isLoading}>
        <p>Loading...</p>
      </Show>
      <Show when={query.isError}>
        <p class={css({ color: 'red.500' })}>Error: {query.error?.message}</p>
      </Show>
      <Show when={deleteMutation.isError}>
        <p class={css({ color: 'red.500' })}>Delete Error: {deleteMutation.error?.message}</p>
      </Show>
      <ul class={stack({ gap: '2' })}>
        <For each={query.data}>
          {(feed) => (
            <li class={flex({ 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '3',
              border: '1px solid',
              borderColor: 'gray.100',
              borderRadius: 'md',
              _hover: { backgroundColor: 'gray.50' }
            })}>
              <div class={stack({ gap: '0' })}>
                <span class={css({ fontWeight: 'medium' })}>{feed.title || 'Untitled Feed'}</span>
                <span class={css({ fontSize: 'xs', color: 'gray.500' })}>{feed.url}</span>
              </div>
              <button 
                onClick={() => deleteMutation.mutate(feed.uuid)}
                disabled={deleteMutation.isPending}
                class={css({
                  color: 'red.500',
                  padding: '1',
                  paddingInline: '2',
                  borderRadius: 'md',
                  fontSize: 'sm',
                  cursor: 'pointer',
                  _hover: { backgroundColor: 'red.50', textDecoration: 'underline' },
                  _disabled: { color: 'gray.400', cursor: 'not-allowed' }
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
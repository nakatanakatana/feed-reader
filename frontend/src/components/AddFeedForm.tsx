import { createMutation, useQueryClient } from '@tanstack/solid-query';
import { createPromiseClient } from '@connectrpc/connect';
import { FeedService } from '../gen/feed/v1/feed_connect';
import { useTransport } from '../lib/transport-context';
import { createSignal } from 'solid-js';

export function AddFeedForm() {
  const transport = useTransport();
  const client = createPromiseClient(FeedService, transport);
  const queryClient = useQueryClient();
  const [url, setUrl] = createSignal('');

  const mutation = createMutation(() => ({
    mutationFn: async (url: string) => {
      const response = await client.createFeed({ url });
      return response.feed;
    },
    onSuccess: () => {
      setUrl('');
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
  }));

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    mutation.mutate(url());
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Feed URL"
        value={url()}
        onInput={(e) => setUrl(e.currentTarget.value)}
        disabled={mutation.isPending}
      />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Adding...' : 'Add Feed'}
      </button>
      {mutation.isError && <p>Error: {mutation.error?.message}</p>}
    </form>
  );
}

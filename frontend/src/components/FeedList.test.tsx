import { render, screen, waitFor } from '@solidjs/testing-library';
import { FeedList } from './FeedList';
import { describe, it, expect } from 'vitest';
import { createRouterTransport } from '@connectrpc/connect';
import { FeedService } from '../gen/feed/v1/feed_connect';
import { TransportProvider } from '../lib/transport-context';
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';

describe('FeedList', () => {
  it('displays a list of feeds', async () => {
    const mockTransport = createRouterTransport(({ service }) => {
      service(FeedService, {
        listFeeds: async () => {
          return {
            feeds: [
              { uuid: '1', title: 'Feed 1', url: 'http://example.com/1' },
              { uuid: '2', title: 'Feed 2', url: 'http://example.com/2' },
            ],
          };
        },
      });
    });

    const queryClient = new QueryClient({
       defaultOptions: {
         queries: {
           retry: false,
         },
       },
    });

    render(() => (
      <TransportProvider transport={mockTransport}>
        <QueryClientProvider client={queryClient}>
          <FeedList />
        </QueryClientProvider>
      </TransportProvider>
    ));

    await waitFor(() => expect(screen.getByText('Feed 1')).toBeInTheDocument());
    expect(screen.getByText('Feed 2')).toBeInTheDocument();
  });
});

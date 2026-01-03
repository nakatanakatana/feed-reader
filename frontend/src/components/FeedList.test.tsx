import { render, screen, waitFor, fireEvent, cleanup } from '@solidjs/testing-library';
import { FeedList } from './FeedList';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRouterTransport } from '@connectrpc/connect';
import { FeedService } from '../gen/feed/v1/feed_connect';
import { TransportProvider } from '../lib/transport-context';
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';

afterEach(() => {
  cleanup();
});

describe('FeedList', () => {
  it('displays a list of feeds', async () => {
    // ... existing test ...
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
         queries: { retry: false },
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

  it('deletes a feed', async () => {
    const deleteFeedMock = vi.fn().mockResolvedValue({});
    const mockTransport = createRouterTransport(({ service }) => {
      service(FeedService, {
        listFeeds: async () => {
          return {
            feeds: [
              { uuid: '1', title: 'Feed 1', url: 'http://example.com/1' },
            ],
          };
        },
        deleteFeed: deleteFeedMock,
      });
    });

    const queryClient = new QueryClient({
       defaultOptions: {
         queries: { retry: false },
         mutations: { retry: false },
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
    
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => expect(deleteFeedMock).toHaveBeenCalledWith(expect.objectContaining({ uuid: '1' }), expect.anything()));
  });
});

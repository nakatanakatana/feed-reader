import { render, screen, waitFor, fireEvent, cleanup } from '@solidjs/testing-library';
import { FeedList } from './FeedList';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRouterTransport, ConnectError, Code } from '@connectrpc/connect';
import { FeedService } from '../gen/feed/v1/feed_connect';
import { TransportProvider } from '../lib/transport-context';
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';

afterEach(() => {
  cleanup();
});

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

  it('displays an error message when listFeeds fails', async () => {
    const mockTransport = createRouterTransport(({ service }) => {
      service(FeedService, {
        listFeeds: async () => {
          throw new ConnectError('Failed to fetch feeds', Code.Internal);
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

        await waitFor(() => expect(screen.getByText(/Error: .*Failed to fetch feeds.*/)).toBeInTheDocument());

      });

    

      it('displays an error message when deleteFeed fails', async () => {

        const mockTransport = createRouterTransport(({ service }) => {

          service(FeedService, {

            listFeeds: async () => {

              return {

                feeds: [{ uuid: '1', title: 'Feed 1', url: 'http://example.com/1' }],

              };

            },

            deleteFeed: async () => {

              throw new ConnectError('Failed to delete feed', Code.PermissionDenied);

            },

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

    

        await waitFor(() => expect(screen.getByText(/Delete Error: .*Failed to delete feed.*/)).toBeInTheDocument());

      });

    });

    
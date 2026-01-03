import { render, screen, fireEvent, waitFor, cleanup } from '@solidjs/testing-library';
import { AddFeedForm } from './AddFeedForm';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRouterTransport, ConnectError, Code } from '@connectrpc/connect';
import { FeedService } from '../gen/feed/v1/feed_connect';
import { TransportProvider } from '../lib/transport-context';
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';

afterEach(() => {
  cleanup();
});

describe('AddFeedForm', () => {
  it('creates a new feed', async () => {
    // ...
    const createFeedMock = vi.fn().mockResolvedValue({ feed: { uuid: '1', url: 'http://example.com' } });
    const mockTransport = createRouterTransport(({ service }) => {
      service(FeedService, {
        createFeed: createFeedMock,
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
          <AddFeedForm />
        </QueryClientProvider>
      </TransportProvider>
    ));

    const input = screen.getByPlaceholderText('Feed URL');
    fireEvent.input(input, { target: { value: 'http://example.com' } });
    
    const button = screen.getByText('Add Feed');
    fireEvent.click(button);

    await waitFor(() => expect(createFeedMock).toHaveBeenCalledWith(expect.objectContaining({ url: 'http://example.com' }), expect.anything()));
  });

  it('displays an error message when createFeed fails', async () => {
    const mockTransport = createRouterTransport(({ service }) => {
      service(FeedService, {
        createFeed: async () => {
          throw new ConnectError('Invalid feed URL', Code.InvalidArgument);
        },
      });
    });

    const queryClient = new QueryClient({
       defaultOptions: {
         mutations: { retry: false },
       },
    });

    render(() => (
      <TransportProvider transport={mockTransport}>
        <QueryClientProvider client={queryClient}>
          <AddFeedForm />
        </QueryClientProvider>
      </TransportProvider>
    ));

    const input = screen.getByPlaceholderText('Feed URL');
    fireEvent.input(input, { target: { value: 'invalid-url' } });
    
    const button = screen.getByText('Add Feed');
    fireEvent.click(button);

    await waitFor(() => expect(screen.getByText(/Error: .*Invalid feed URL.*/)).toBeInTheDocument());
  });
});

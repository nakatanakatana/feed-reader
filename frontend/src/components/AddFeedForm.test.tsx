import { render } from 'solid-js/web';
import { AddFeedForm } from './AddFeedForm';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { page } from 'vitest/browser';
import { createRouterTransport, ConnectError, Code } from '@connectrpc/connect';
import { FeedService } from '../gen/feed/v1/feed_connect';
import { TransportProvider } from '../lib/transport-context';
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';

describe('AddFeedForm', () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = '';
  });

  it('creates a new feed', async () => {
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

    dispose = render(() => (
      <TransportProvider transport={mockTransport}>
        <QueryClientProvider client={queryClient}>
          <AddFeedForm />
        </QueryClientProvider>
      </TransportProvider>
    ), document.body);

    const input = page.getByPlaceholder('Feed URL');
    await input.fill('http://example.com');
    
    const button = page.getByText('Add Feed');
    await button.click();

    // Use expect.poll to wait for the mock to be called
    await expect.poll(() => createFeedMock.mock.calls.length).toBeGreaterThan(0);
    expect(createFeedMock).toHaveBeenCalledWith(expect.objectContaining({ url: 'http://example.com' }), expect.anything());
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

    dispose = render(() => (
      <TransportProvider transport={mockTransport}>
        <QueryClientProvider client={queryClient}>
          <AddFeedForm />
        </QueryClientProvider>
      </TransportProvider>
    ), document.body);

    const input = page.getByPlaceholder('Feed URL');
    await input.fill('invalid-url');
    
    const button = page.getByText('Add Feed');
    await button.click();

    await expect.element(page.getByText(/Error: .*Invalid feed URL.*/)).toBeInTheDocument();
  });
});
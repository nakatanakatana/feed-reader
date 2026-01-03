import { render } from 'solid-js/web';
import { describe, it, expect, afterEach } from 'vitest';
import { page } from 'vitest/browser';
import { createConnectTransport } from '@connectrpc/connect-web';
import { FeedService } from '../gen/feed/v1/feed_connect';
import { TransportProvider } from '../lib/transport-context';
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';
import { FeedList } from '../components/FeedList';

describe('MSW Integration', () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = '';
  });

  it('intercepts Connect RPC requests via MSW in a component', async () => {
    // 実際のネットワークを使うトランスポートを作成（MSWがこれをインターセプトする）
    const transport = createConnectTransport({
      baseUrl: 'http://localhost:3000',
    });

    const queryClient = new QueryClient({
       defaultOptions: {
         queries: { retry: false },
       },
    });

    dispose = render(() => (
      <TransportProvider transport={transport}>
        <QueryClientProvider client={queryClient}>
          <FeedList />
        </QueryClientProvider>
      </TransportProvider>
    ), document.body);

    // MSWのhandlers.tsで定義した初期データが表示されることを確認
    await expect.element(page.getByText('Example Feed 1')).toBeInTheDocument();
    await expect.element(page.getByText('Example Feed 2')).toBeInTheDocument();
  });
});

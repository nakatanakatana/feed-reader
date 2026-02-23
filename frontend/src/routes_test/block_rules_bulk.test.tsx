import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/solid-router';
import { render } from 'solid-js/web';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { page } from 'vitest/browser';
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';
import { routeTree } from '../routeTree.gen';
import { queryClient } from '../lib/query';
import { TransportProvider } from '../lib/transport-context';

describe('BlockRules page bulk add button', () => {
  let dispose: () => void;

  beforeEach(() => {
    queryClient.clear();
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = '';
  });

  it('should have Bulk Add button', async () => {
    const history = createMemoryHistory({ initialEntries: ['/block-rules'] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <TransportProvider transport={{} as any}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    await expect.element(page.getByRole('button', { name: 'Bulk Add' })).toBeInTheDocument();
  });
});

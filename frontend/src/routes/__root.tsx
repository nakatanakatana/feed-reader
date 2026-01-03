import { Link, Outlet, createRootRoute } from '@tanstack/solid-router';
import { TanStackRouterDevtools } from '@tanstack/solid-router-devtools';
import { QueryClientProvider } from '@tanstack/solid-query';
import { TransportProvider } from '../lib/transport-context';
import { queryClient, transport } from '../lib/query';
import { css } from '../../styled-system/css'
import { flex } from '../../styled-system/patterns'

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => {
    return (
      <div>
        <p>This is the notFoundComponent configured on root route</p>
        <Link to="/">Start Over</Link>
      </div>
    );
  },
});

function RootComponent() {
  const headerStyle = css({
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    borderBottomWidth: '1px',
    gap: '10px',
    fontSize: 'lg',
  })

  const selectedRouteStyle = css({
    fontWeight: 'bold',
  })

  return (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        <>
          <div class={headerStyle}>
            <Link
              to="/"
              activeProps={{
                class: selectedRouteStyle,
              }}
              activeOptions={{ exact: true }}
            >
              Home
            </Link>{' '}
            <Link
              to="/posts"
              activeProps={{
                class: selectedRouteStyle,
              }}
            >
              Posts
            </Link>{' '}
            <Link
              to="/feeds"
              activeProps={{
                class: selectedRouteStyle,
              }}
            >
              Feeds
            </Link>{' '}
          </div>
          <hr />
          <Outlet />
          {/* Start rendering router matches */}
          <TanStackRouterDevtools position="bottom-right" />
        </>
      </QueryClientProvider>
    </TransportProvider>
  );
}

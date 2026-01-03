import { render } from 'solid-js/web';
import 'solid-devtools';
import { RouterProvider, createRouter } from '@tanstack/solid-router';
import { routeTree } from './routeTree.gen';
import './styles.css';
import { initMocks } from './mocks/init';
import { config } from './config'

// Set up a Router instance
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultStaleTime: 5000,
  scrollRestoration: true,
});

// Register things for typesafety
declare module '@tanstack/solid-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('app')!;

if (!rootElement.innerHTML) {
  initMocks(config).then(() => {
    render(() => <RouterProvider router={router} />, rootElement);
  });
}

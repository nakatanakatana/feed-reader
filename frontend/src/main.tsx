import { QueryClientProvider } from "@tanstack/solid-query";
import "solid-devtools";
import { createRouter, RouterProvider } from "@tanstack/solid-router";
import { render } from "solid-js/web";

import { config } from "./config";
import { queryClient, transport } from "./lib/query";
import { ToastProvider } from "./lib/toast";

import "./styles.css";
import { TransportProvider } from "./lib/transport-context";
import { initMocks } from "./mocks/init";
import { initOTEL } from "./otel";
import { initPWA } from "./pwa";
import { routeTree } from "./routeTree.gen";

// Set up OTEL
if (import.meta.env.VITE_OTEL_EXPORTER_URL) {
  initOTEL();
}

// Set up Service Worker
initPWA();

// Set up a Router instance
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultStaleTime: 5000,
  scrollRestoration: true,
});

// Register things for typesafety
declare module "@tanstack/solid-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app");

if (rootElement && !rootElement.innerHTML) {
  initMocks(config).then(() => {
    render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </QueryClientProvider>
        </TransportProvider>
      ),
      rootElement,
    );
  });
}

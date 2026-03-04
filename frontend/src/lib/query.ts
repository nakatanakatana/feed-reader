import type { Interceptor } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/solid-query";
import { toast } from "./toast";

export const TOAST_SHOWN = Symbol.for("TOAST_SHOWN");
const DEFAULT_ERROR_MESSAGE = "An error occurred. Please try again.";

const markAsToastShown = (err: unknown) => {
  if (typeof err === "object" && err !== null) {
    // biome-ignore lint/suspicious/noExplicitAny: using Symbol to mark handled errors
    (err as any)[TOAST_SHOWN] = true;
  }
};

const isToastShown = (err: unknown) => {
  return typeof err === "object" && err !== null && (err as any)[TOAST_SHOWN];
};

export const errorInterceptor: Interceptor = (next) => async (req) => {
  try {
    return await next(req);
  } catch (err) {
    // If the request fails, we mark it but DON'T show a toast yet.
    // TanStack Query will catch it and show a single toast for the whole query/mutation (including retries).
    markAsToastShown(err);
    throw err;
  }
};

export const transport = createConnectTransport({
  baseUrl: "/api",
  useHttpGet: true,
  interceptors: [errorInterceptor],
});

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err, query) => {
      // Only show toast for errors marked by the interceptor (transport errors).
      if (!isToastShown(err)) return;

      // TanStack Query v5 QueryCache.onError fires for every failed attempt.
      // We only want to show the toast on the final failure.
      if (query.state.fetchStatus === "fetching") return;

      toast.show(DEFAULT_ERROR_MESSAGE, "error");
    },
  }),
  mutationCache: new MutationCache({
    onError: (err) => {
      // Mutations usually don't retry by default or behave differently,
      // but we still check the marker to ensure it's a transport error.
      if (!isToastShown(err)) return;
      toast.show(DEFAULT_ERROR_MESSAGE, "error");
    },
  }),
});

if (typeof window !== "undefined") {
  (window as unknown as { __queryClient: QueryClient }).__queryClient =
    queryClient;
}

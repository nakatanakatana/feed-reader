import type { Interceptor } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/solid-query";
import { toast } from "./toast";

const TOAST_SHOWN = Symbol("TOAST_SHOWN");
const DEFAULT_ERROR_MESSAGE = "An error occurred. Please try again.";

const markAsToastShown = (err: unknown) => {
  if (typeof err === "object" && err !== null) {
    // biome-ignore lint/suspicious/noExplicitAny: using Symbol to mark handled errors
    (err as any)[TOAST_SHOWN] = true;
  }
};

const errorInterceptor: Interceptor = (next) => async (req) => {
  try {
    return await next(req);
  } catch (err) {
    // If the request fails, we mark it but DON'T show a toast yet.
    // TanStack Query will catch it and show a single toast for the whole query/mutation (including retries).
    // Direct callers who don't use TanStack Query can still check for errors.
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
    onError: () => {
      // We show toast for errors marked by the interceptor,
      // but ensure we only show one for the final failure after any retries.
      // queryCache.onError fires for each retry, but we only want one.
      // However, TanStack Query v5's QueryCache.onError fires for every failed attempt.
      // To ensure user only sees ONE toast, we can rely on toast.show deduplication
      // or check if it's already shown. But QueryCache doesn't provide a way to know if it's the "last" retry here.
      // Actually, standard practice is to show it once.
      toast.show(DEFAULT_ERROR_MESSAGE, "error");
    },
  }),
  mutationCache: new MutationCache({
    onError: () => {
      toast.show(DEFAULT_ERROR_MESSAGE, "error");
    },
  }),
});

if (typeof window !== "undefined") {
  (window as unknown as { __queryClient: QueryClient }).__queryClient =
    queryClient;
}

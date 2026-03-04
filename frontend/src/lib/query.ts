import type { Interceptor } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/solid-query";
import { toast } from "./toast";

const TOAST_SHOWN = Symbol("TOAST_SHOWN");

const errorInterceptor: Interceptor = (next) => async (req) => {
  try {
    return await next(req);
  } catch (err) {
    (err as Record<symbol, unknown>)[TOAST_SHOWN] = true;
    toast.show("An error occurred. Please try again.", "error");
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
    onError: (err) => {
      if ((err as Record<symbol, unknown>)[TOAST_SHOWN]) return;
      toast.show("An error occurred. Please try again.", "error");
    },
  }),
  mutationCache: new MutationCache({
    onError: (err) => {
      if ((err as Record<symbol, unknown>)[TOAST_SHOWN]) return;
      toast.show("An error occurred. Please try again.", "error");
    },
  }),
});

if (typeof window !== "undefined") {
  (window as unknown as { __queryClient: QueryClient }).__queryClient =
    queryClient;
}

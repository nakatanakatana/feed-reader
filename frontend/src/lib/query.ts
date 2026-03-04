import type { Interceptor } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/solid-query";
import { toast } from "./toast";

const TOAST_SHOWN = Symbol("TOAST_SHOWN");

const errorInterceptor: Interceptor = (next) => async (req) => {
  try {
    return await next(req);
  } catch (err) {
    // biome-ignore lint/suspicious/noExplicitAny: using Symbol to mark handled errors
    (err as any)[TOAST_SHOWN] = true;
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
      // biome-ignore lint/suspicious/noExplicitAny: using Symbol to mark handled errors
      if ((err as any)[TOAST_SHOWN]) return;
      toast.show("An error occurred. Please try again.", "error");
    },
  }),
  mutationCache: new MutationCache({
    onError: (err) => {
      // biome-ignore lint/suspicious/noExplicitAny: using Symbol to mark handled errors
      if ((err as any)[TOAST_SHOWN]) return;
      toast.show("An error occurred. Please try again.", "error");
    },
  }),
});

if (typeof window !== "undefined") {
  (window as unknown as { __queryClient: QueryClient }).__queryClient =
    queryClient;
}

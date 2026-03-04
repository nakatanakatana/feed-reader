import type { Interceptor } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/solid-query";
import { toast } from "./toast";

const errorInterceptor: Interceptor = (next) => async (req) => {
  try {
    return await next(req);
  } catch (err) {
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
    onError: () => {
      toast.show("An error occurred. Please try again.", "error");
    },
  }),
  mutationCache: new MutationCache({
    onError: () => {
      toast.show("An error occurred. Please try again.", "error");
    },
  }),
});

if (typeof window !== "undefined") {
  (window as unknown as { __queryClient: QueryClient }).__queryClient =
    queryClient;
}

import type { Interceptor } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/solid-query";
import { toast } from "./toast";

const TOAST_SHOWN = Symbol("TOAST_SHOWN");
const DEFAULT_ERROR_MESSAGE = "An error occurred. Please try again.";

const markAsToastShown = (err: unknown) => {
  if (typeof err === "object" && err !== null) {
    (err as any)[TOAST_SHOWN] = true;
  }
};

const isToastShown = (err: unknown) => {
  return typeof err === "object" && err !== null && (err as any)[TOAST_SHOWN];
};

const errorInterceptor: Interceptor = (next) => async (req) => {
  try {
    return await next(req);
  } catch (err) {
    markAsToastShown(err);
    toast.show(DEFAULT_ERROR_MESSAGE, "error");
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
      if (isToastShown(err)) return;
      toast.show(DEFAULT_ERROR_MESSAGE, "error");
    },
  }),
  mutationCache: new MutationCache({
    onError: (err) => {
      if (isToastShown(err)) return;
      toast.show(DEFAULT_ERROR_MESSAGE, "error");
    },
  }),
});

if (typeof window !== "undefined") {
  (window as unknown as { __queryClient: QueryClient }).__queryClient =
    queryClient;
}

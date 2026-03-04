import { Code, ConnectError, type Interceptor } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/solid-query";
import { toast } from "./toast";

export const ERROR_TOAST_ELIGIBLE = Symbol.for("ERROR_TOAST_ELIGIBLE");
const DEFAULT_ERROR_MESSAGE = "An error occurred. Please try again.";

const markAsToastEligible = (err: unknown) => {
  if (typeof err === "object" && err !== null) {
    // biome-ignore lint/suspicious/noExplicitAny: using Symbol to mark handled errors
    (err as any)[ERROR_TOAST_ELIGIBLE] = true;
  }
};

const isToastEligible = (err: unknown) => {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as any)[ERROR_TOAST_ELIGIBLE]
  );
};

export const errorInterceptor: Interceptor = (next) => async (req) => {
  try {
    return await next(req);
  } catch (err) {
    // Only mark genuine transport/network failures or server unavailability for the global toast.
    // Application-level errors (like permission or validation) should be handled locally.
    const connectErr = ConnectError.from(err);
    if (
      connectErr.code === Code.Unavailable ||
      connectErr.code === Code.Unknown
    ) {
      markAsToastEligible(err);
    }
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
      if (!isToastEligible(err)) return;

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
      if (!isToastEligible(err)) return;
      toast.show(DEFAULT_ERROR_MESSAGE, "error");
    },
  }),
});

if (typeof window !== "undefined") {
  (window as unknown as { __queryClient: QueryClient }).__queryClient =
    queryClient;
}

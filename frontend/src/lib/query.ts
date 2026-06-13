import { MutationCache, QueryCache, QueryClient } from "@tanstack/solid-query";
import { toast } from "./toast-store";

export const ERROR_TOAST_ELIGIBLE = Symbol.for("ERROR_TOAST_ELIGIBLE");
const DEFAULT_ERROR_MESSAGE = "An error occurred. Please try again.";

const markAsToastEligible = (err: unknown) => {
  if (typeof err === "object" && err !== null) {
    Reflect.set(err, ERROR_TOAST_ELIGIBLE, true);
  }
};

const isToastEligible = (err: unknown): boolean => {
  return (
    typeof err === "object" &&
    err !== null &&
    !!Reflect.get(err, ERROR_TOAST_ELIGIBLE)
  );
};

export type RequestMiddleware = (
  next: (req: unknown) => Promise<unknown>,
) => (req: unknown) => Promise<unknown>;

export const errorInterceptor: RequestMiddleware = (next) => async (req) => {
  try {
    return await next(req);
  } catch (err) {
    // Only mark genuine network failures or server unavailability for the global toast.
    // Application-level errors (like permission or validation) should be handled locally.
    const isNetworkError =
      err instanceof TypeError ||
      (typeof DOMException !== "undefined" && err instanceof DOMException);
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String(Reflect.get(err, "code"))
        : "";

    if (code === "unavailable" || isNetworkError) {
      markAsToastEligible(err);
    }
    throw err;
  }
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err, query) => {
      // Only show toast for errors marked by the interceptor.
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
      // but we still check the marker to ensure it's a network-level error.
      if (!isToastEligible(err)) return;
      toast.show(DEFAULT_ERROR_MESSAGE, "error");
    },
  }),
});

if (typeof window !== "undefined") {
  window.__queryClient = queryClient;
}

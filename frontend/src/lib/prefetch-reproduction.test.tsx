import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/solid-query";
import { createSignal, Show } from "solid-js";
import { render } from "solid-js/web";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("useQuery staleTime reproduction", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  it("triggers a refetch when staleTime is 0 (default) even if data is in cache", async () => {
    const queryFn = vi.fn().mockResolvedValue({ id: "item1", title: "Test Item" });
    
    // 1. Prefetch with long staleTime
    await queryClient.prefetchQuery({
      queryKey: ["item", "item1"],
      queryFn,
      staleTime: 5 * 60 * 1000,
    });

    expect(queryFn).toHaveBeenCalledTimes(1);
    
    // Verify it's in cache
    const state = queryClient.getQueryState(["item", "item1"]);
    expect(state?.data).toEqual({ id: "item1", title: "Test Item" });

    // 2. Consume with useQuery (default staleTime: 0)
    const TestComponent = () => {
      const query = useQuery(() => ({
        queryKey: ["item", "item1"],
        queryFn,
      }));
      return <Show when={query.data}><div>{query.data?.title}</div></Show>;
    };

    const dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      ),
      document.body
    );

    // Wait for any potential background refetches
    await new Promise((resolve) => setTimeout(resolve, 50));

    // It should have been called again because useQuery defaults to staleTime: 0
    // and considers the cached data "stale" immediately, triggering a background refetch.
    expect(queryFn).toHaveBeenCalledTimes(2);

    dispose();
    document.body.innerHTML = "";
  });

  it("does NOT trigger a refetch when staleTime matches prefetch", async () => {
    const queryFn = vi.fn().mockResolvedValue({ id: "item1", title: "Test Item" });
    
    // 1. Prefetch with long staleTime
    await queryClient.prefetchQuery({
      queryKey: ["item", "item1"],
      queryFn,
      staleTime: 5 * 60 * 1000,
    });

    expect(queryFn).toHaveBeenCalledTimes(1);

    // 2. Consume with useQuery and matching staleTime
    const TestComponent = () => {
      const query = useQuery(() => ({
        queryKey: ["item", "item1"],
        queryFn,
        staleTime: 5 * 60 * 1000,
      }));
      return <Show when={query.data}><div>{query.data?.title}</div></Show>;
    };

    const dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      ),
      document.body
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    // It should NOT have been called again
    expect(queryFn).toHaveBeenCalledTimes(1);

    dispose();
    document.body.innerHTML = "";
  });
});

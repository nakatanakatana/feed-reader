import { useLiveQuery } from "@tanstack/solid-db";
import { vi } from "vitest";

export const setupLiveQuery = (feeds: unknown[], isLoading = false) => {
  const useLiveQueryMock = vi.mocked(useLiveQuery) as unknown as {
    mockImplementation: (
      impl: (...args: unknown[]) => ReturnType<typeof useLiveQuery>,
    ) => void;
  };

  // biome-ignore lint/suspicious/noExplicitAny: mock implementation
  useLiveQueryMock.mockImplementation((callback?: any) => {
    // biome-ignore lint/suspicious/noExplicitAny: mock implementation
    const makeQuery = (rows: any[]) => {
      const q = {
        __data: rows,
        // biome-ignore lint/suspicious/noExplicitAny: mock implementation
        from: (src: any) => {
          if (
            src &&
            typeof src === "function" &&
            src() &&
            (src() as any).__data
          )
            return makeQuery((src() as any).__data);
          return q;
        },
        // biome-ignore lint/suspicious/noExplicitAny: mock implementation
        where: (p: any) =>
          makeQuery(
            rows.filter((r) => p({ item: r, feed: r, ft: r, tag: r, i: r })),
          ),
        // biome-ignore lint/suspicious/noExplicitAny: mock implementation
        orderBy: (s: any, d: any) => {
          const sorted = [...rows].sort((a, b) => {
            const aVal = s({ item: a, feed: a, ft: a, tag: a, i: a });
            const bVal = s({ item: b, feed: b, ft: b, tag: b, i: b });

            const aDate = Date.parse(String(aVal));
            const bDate = Date.parse(String(bVal));

            if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
              return d === "desc" ? bDate - aDate : aDate - bDate;
            }

            return d === "desc"
              ? String(bVal).localeCompare(String(aVal))
              : String(aVal).localeCompare(String(bVal));
          });
          return makeQuery(sorted);
        },
        // biome-ignore lint/suspicious/noExplicitAny: mock implementation
        select: (s: any) =>
          makeQuery(
            rows.map((r) => s({ item: r, feed: r, ft: r, tag: r, i: r })),
          ),
        // biome-ignore lint/suspicious/noExplicitAny: mock implementation
        innerJoin: (_o: any, _p: any) => q,
        // biome-ignore lint/suspicious/noExplicitAny: mock implementation
        leftJoin: (_o: any, _p: any) => q,
        // biome-ignore lint/suspicious/noExplicitAny: mock implementation
        groupBy: (_s: any) => q,
      };
      return q;
    };

    let data = feeds;
    if (typeof callback === "function") {
      const result = callback(makeQuery(feeds));
      data = result?.__data ?? feeds;
    } else if (callback && (callback as any).__definition) {
      const result = (callback as any).__definition(makeQuery(feeds));
      data = result?.__data ?? feeds;
    }

    // biome-ignore lint/suspicious/noExplicitAny: mock implementation
    const accessor = (() => data) as any;
    accessor.isLoading = isLoading;
    accessor.isError = false;
    accessor.isPending = isLoading;
    return accessor;
  });
};

import { createLiveQueryCollection, useLiveQuery } from "@tanstack/solid-db";
import { vi } from "vitest";

/**
 * Sets up mocks for TanStack DB live queries.
 * Note: For this to work in Vitest browser mode, vi.mock("@tanstack/solid-db")
 * must be called in the test file or setup file.
 */
export const setupLiveQuery = (feeds: unknown[], isLoading = false) => {
  // biome-ignore lint/suspicious/noExplicitAny: mock implementation
  const implementation = (callback?: any) => {
    // biome-ignore lint/suspicious/noExplicitAny: mock implementation
    const makeQuery = (rows: any[]) => {
      const q = {
        __data: rows,
        // biome-ignore lint/suspicious/noExplicitAny: mock implementation
        from: (src: any) => {
          if (src && typeof src === "function") {
            // biome-ignore lint/suspicious/noExplicitAny: mock implementation
            const srcData = (src as any).__data;
            if (srcData) {
              return makeQuery(srcData);
            }

            const result = src();
            // biome-ignore lint/suspicious/noExplicitAny: mock implementation
            const resultData = (result as any)?.__data;
            if (resultData) {
              return makeQuery(resultData);
            }
          }
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

            const aText = String(aVal ?? "");
            const bText = String(bVal ?? "");

            // Try date comparison first
            const aDate = Date.parse(aText);
            const bDate = Date.parse(bText);
            if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
              return d === "desc" ? bDate - aDate : aDate - bDate;
            }

            return d === "desc"
              ? bText.localeCompare(aText)
              : aText.localeCompare(bText);
          });
          return makeQuery(sorted);
        },
        // biome-ignore lint/suspicious/noExplicitAny: mock implementation
        select: (s: any) =>
          makeQuery(
            rows.map((r) => s({ item: r, feed: r, ft: r, tag: r, i: r })),
          ),
        innerJoin: () => q,
        leftJoin: () => q,
        groupBy: () => q,
      };
      return q;
    };

    let data = feeds;
    if (typeof callback === "function") {
      const result = callback(makeQuery(feeds));
      data = result?.__data ?? feeds;
    }

    // biome-ignore lint/suspicious/noExplicitAny: mock implementation
    const accessor = (() => data) as any;
    accessor.isLoading = isLoading;
    return accessor;
  };

  try {
    // biome-ignore lint/suspicious/noExplicitAny: mock implementation
    const useLiveQueryMock = vi.mocked(useLiveQuery) as any;
    if (useLiveQueryMock?.mockImplementation) {
      useLiveQueryMock.mockImplementation(implementation);
    }
    const createLiveQueryCollectionMock = vi.mocked(
      createLiveQueryCollection,
      // biome-ignore lint/suspicious/noExplicitAny: mock implementation
    ) as any;
    if (createLiveQueryCollectionMock?.mockImplementation) {
      createLiveQueryCollectionMock.mockImplementation(implementation);
    }
  } catch (e) {
    console.warn(
      "setupLiveQuery: Failed to apply mocks. Ensure @tanstack/solid-db is mocked via vi.mock().",
      e,
    );
  }
};

import { useLiveQuery } from "@tanstack/solid-db";
import { vi } from "vitest";

export const setupLiveQuery = (feeds: unknown[], isLoading = false) => {
  const useLiveQueryMock = vi.mocked(useLiveQuery) as unknown as {
    mockImplementation: (
      impl: (...args: unknown[]) => ReturnType<typeof useLiveQuery>,
    ) => void;
  };

  useLiveQueryMock.mockImplementation((callback?: unknown) => {
    const makeQuery = (rows: unknown[]) => ({
      __data: rows,
      fn: {
        where: (predicate: (row: { feed: unknown }) => boolean) =>
          makeQuery(rows.filter((row) => predicate({ feed: row }))),
      },
      orderBy: (
        selector: (row: { feed: unknown }) => unknown,
        direction: "asc" | "desc",
      ) => {
        const sorted = [...rows].sort((a, b) => {
          const aValue = selector({ feed: a });
          const bValue = selector({ feed: b });
          const aText = String(aValue ?? "");
          const bText = String(bValue ?? "");
          return direction === "desc"
            ? bText.localeCompare(aText)
            : aText.localeCompare(bText);
        });
        return makeQuery(sorted);
      },
    });

    const accessor = (() => {
      const query =
        typeof callback === "function"
          ? callback({
              from: () => makeQuery(feeds),
            } as unknown)
          : undefined;
      return (query as { __data?: unknown[] } | undefined)?.__data ?? feeds;
    }) as unknown as ReturnType<typeof useLiveQuery>;
    (accessor as { isLoading?: boolean }).isLoading = isLoading;
    return accessor;
  });
};

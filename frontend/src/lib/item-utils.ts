import type { Timestamp } from "@bufbuild/protobuf/wkt";

export type DateFilterValue = "all" | "24h" | "7d" | "30d" | "90d" | "365d";

export interface Item {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  createdAt: string;
  isRead: boolean;
}

export enum SortOrder {
  UNSPECIFIED = 0,
  DESC = 1,
  ASC = 2,
}

export interface ItemFilters {
  isRead?: boolean;
  sortOrder?: SortOrder;
}

export const getPublishedSince = (
  value: DateFilterValue,
): Timestamp | undefined => {
  if (value === "all") return undefined;
  const now = new Date();
  let since: Date;
  switch (value) {
    case "24h":
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "365d":
      since = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      return undefined;
  }
  return {
    seconds: BigInt(Math.floor(since.getTime() / 1000)),
    nanos: (since.getTime() % 1000) * 1000000,
  } as Timestamp;
};

export const formatUnreadCount = (count: number): string => {
  if (count >= 1000) {
    return "999+";
  }
  return count.toString();
};

export const formatDate = (dateString: string) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (_e) {
    return dateString;
  }
};

export const getItemDisplayDate = (
  item: Pick<Item, "publishedAt" | "createdAt">,
) => {
  if (item.publishedAt) {
    return {
      label: "Published",
      date: item.publishedAt,
    };
  }
  return {
    label: "Received",
    date: item.createdAt,
  };
};

export const filterAndSortItems = (
  items: Item[],
  filters: ItemFilters,
): Item[] => {
  let result = [...items];

  if (filters.isRead !== undefined) {
    result = result.filter((item) => item.isRead === filters.isRead);
  }

  const getSortKey = (item: Item) => item.publishedAt || item.createdAt;

  if (filters.sortOrder === SortOrder.ASC) {
    result.sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)));
  } else if (
    filters.sortOrder === SortOrder.DESC ||
    filters.sortOrder === SortOrder.UNSPECIFIED
  ) {
    // Default to DESC
    result.sort((a, b) => getSortKey(b).localeCompare(getSortKey(a)));
  }

  return result;
};

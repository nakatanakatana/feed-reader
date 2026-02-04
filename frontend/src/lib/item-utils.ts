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
  if (item.createdAt) {
    return {
      label: "Received",
      date: item.createdAt,
    };
  }
  return {
    label: "Published",
    date: item.publishedAt,
  };
};

export const normalizeCategories = (categories: string): string[] => {
  if (!categories) return [];
  const trimmed = categories.trim();
  const normalizeValue = (value: string) => {
    const valueTrimmed = value.trim();
    if (
      valueTrimmed.length >= 2 &&
      valueTrimmed.startsWith('"') &&
      valueTrimmed.endsWith('"')
    ) {
      return valueTrimmed.slice(1, -1).trim();
    }
    return valueTrimmed;
  };
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((value) => value != null)
          .map((value) => normalizeValue(String(value)))
          .filter((value) => value.length > 0);
      }
    } catch (_error) {
      // Fall back to comma-splitting below.
    }
  }
  let fallbackSource = trimmed;
  if (fallbackSource.startsWith("[")) {
    fallbackSource = fallbackSource.slice(1);
  }
  if (fallbackSource.endsWith("]")) {
    fallbackSource = fallbackSource.slice(0, -1);
  }
  return fallbackSource
    .split(",")
    .map((value) => normalizeValue(value))
    .filter((value) => value.length > 0);
};

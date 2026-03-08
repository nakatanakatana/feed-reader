import type { Timestamp } from "@bufbuild/protobuf/wkt";

export type DateFilterValue = "all" | "24h" | "7d" | "30d" | "90d" | "365d";

export interface Item {
  id: string;
  title: string;
  description: string;
  publishedAt?: Date;
  createdAt?: Date;
  isRead: boolean;
}

export const dateToTimestamp = (d: Date): Timestamp => {
  return {
    seconds: BigInt(Math.floor(d.getTime() / 1000)),
    nanos: (d.getTime() % 1000) * 1000000,
  } as Timestamp;
};

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
  return dateToTimestamp(since);
};

export const formatUnreadCount = (count: number): string => {
  if (count >= 1000) {
    return "999+";
  }
  return count.toString();
};

const toDate = (
  ts: Date | Timestamp | string | undefined,
): Date | undefined => {
  if (!ts) return undefined;
  if (ts instanceof Date) return ts;
  if (typeof ts === "string") {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return new Date(Number(ts.seconds) * 1000 + ts.nanos / 1000000);
};

export const formatDate = (date: Date | Timestamp | string | undefined) => {
  const d = toDate(date);
  if (!d) return "";
  return d.toLocaleString();
};

export const formatRelativeDate = (
  date: Date | Timestamp | string | undefined,
) => {
  const d = toDate(date);
  if (!d) return "";
  const now = new Date();
  const diffInSeconds = Math.floor((d.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  const absDiffInSeconds = Math.abs(diffInSeconds);
  if (absDiffInSeconds < 60) {
    return rtf.format(diffInSeconds, "second");
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const absDiffInMinutes = Math.abs(diffInMinutes);
  if (absDiffInMinutes < 60) {
    return rtf.format(diffInMinutes, "minute");
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  const absDiffInHours = Math.abs(diffInHours);
  if (absDiffInHours < 24) {
    return rtf.format(diffInHours, "hour");
  }
  const diffInDays = Math.floor(diffInHours / 24);
  const absDiffInDays = Math.abs(diffInDays);
  if (absDiffInDays < 30) {
    return rtf.format(diffInDays, "day");
  }
  const diffInMonths = Math.floor(diffInDays / 30);
  const absDiffInMonths = Math.abs(diffInMonths);
  if (absDiffInMonths < 12) {
    return rtf.format(diffInMonths, "month");
  }
  const diffInYears = Math.floor(diffInMonths / 12);
  return rtf.format(diffInYears, "year");
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

export const extractHostname = (url: string): string => {
  if (!url) return "";
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname;
    if (hostname.startsWith("www.")) {
      hostname = hostname.slice(4);
    }
    return hostname;
  } catch (_e) {
    return "";
  }
};

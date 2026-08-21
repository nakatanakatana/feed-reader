import { feedIgnoreWindowsList } from "./api/generated/client/feedIgnoreWindowsList";
import { feedIgnoreWindowsManage } from "./api/generated/client/feedIgnoreWindowsManage";
import { ignoreWindowsCreate } from "./api/generated/client/ignoreWindowsCreate";
import { ignoreWindowsDelete } from "./api/generated/client/ignoreWindowsDelete";
import { ignoreWindowsList } from "./api/generated/client/ignoreWindowsList";
import { ignoreWindowsUpdate } from "./api/generated/client/ignoreWindowsUpdate";
import { tagIgnoreWindowsList } from "./api/generated/client/tagIgnoreWindowsList";
import { tagIgnoreWindowsManage } from "./api/generated/client/tagIgnoreWindowsManage";
import type {
  CreateIgnoreWindowRequest,
  FeedIgnoreWindowsListQueryParams,
  ManageFeedIgnoreWindowsRequest,
  ManageTagIgnoreWindowsRequest,
  TagIgnoreWindowsListQueryParams,
  UpdateIgnoreWindowRequest,
} from "./api/types";
import type { components } from "./api/types";
import { toDate } from "./date-utils";
import { queryClient } from "./query";

export interface IgnoreWindow {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  timezone: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FeedIgnoreWindow {
  id: string;
  feedId: string;
  ignoreWindowId: string;
}

export interface TagIgnoreWindow {
  id: string;
  tagId: string;
  ignoreWindowId: string;
}

type OpenAPIIgnoreWindow = components["schemas"]["IgnoreWindow"];
type OpenAPIFeedIgnoreWindow = components["schemas"]["FeedIgnoreWindow"];
type OpenAPITagIgnoreWindow = components["schemas"]["TagIgnoreWindow"];

export const mapOpenAPIIgnoreWindow = (
  window: OpenAPIIgnoreWindow,
): IgnoreWindow => ({
  id: window.id,
  name: window.name,
  startTime: window.startTime,
  endTime: window.endTime,
  daysOfWeek: window.daysOfWeek,
  timezone: window.timezone,
  createdAt: toDate(window.createdAt),
  updatedAt: toDate(window.updatedAt),
});

export const mapOpenAPIFeedIgnoreWindow = (
  fiw: OpenAPIFeedIgnoreWindow,
): FeedIgnoreWindow => ({
  id: `${fiw.feedId}-${fiw.ignoreWindowId}`,
  feedId: fiw.feedId,
  ignoreWindowId: fiw.ignoreWindowId,
});

export const mapOpenAPITagIgnoreWindow = (
  tiw: OpenAPITagIgnoreWindow,
): TagIgnoreWindow => ({
  id: `${tiw.tagId}-${tiw.ignoreWindowId}`,
  tagId: tiw.tagId,
  ignoreWindowId: tiw.ignoreWindowId,
});

export const ignoreWindowsQueryOptions = {
  queryKey: ["ignore-windows"] as const,
  queryFn: async () => {
    const response = await ignoreWindowsList();
    return response.ignoreWindows.map(mapOpenAPIIgnoreWindow);
  },
};

export const feedIgnoreWindowsQueryOptions = (
  params?: FeedIgnoreWindowsListQueryParams,
) => ({
  queryKey: params
    ? (["feed-ignore-windows", params] as const)
    : (["feed-ignore-windows"] as const),
  queryFn: async () => {
    const response = await feedIgnoreWindowsList(params);
    return response.feedIgnoreWindows.map(mapOpenAPIFeedIgnoreWindow);
  },
});

export const tagIgnoreWindowsQueryOptions = (
  params?: TagIgnoreWindowsListQueryParams,
) => ({
  queryKey: params
    ? (["tag-ignore-windows", params] as const)
    : (["tag-ignore-windows"] as const),
  queryFn: async () => {
    const response = await tagIgnoreWindowsList(params);
    return response.tagIgnoreWindows.map(mapOpenAPITagIgnoreWindow);
  },
});

export const ignoreWindowInsert = async (data: CreateIgnoreWindowRequest) => {
  const response = await ignoreWindowsCreate(data);
  await queryClient.invalidateQueries({ queryKey: ["ignore-windows"] });
  return mapOpenAPIIgnoreWindow(response.ignoreWindow);
};

export const createIgnoreWindow = ignoreWindowInsert;

export const ignoreWindowUpdate = async (
  id: string,
  data: UpdateIgnoreWindowRequest,
) => {
  const response = await ignoreWindowsUpdate(id, data);
  await queryClient.invalidateQueries({ queryKey: ["ignore-windows"] });
  return mapOpenAPIIgnoreWindow(response.ignoreWindow);
};

export const updateIgnoreWindow = ignoreWindowUpdate;

export const ignoreWindowDelete = async (id: string) => {
  await ignoreWindowsDelete(id);
  await queryClient.invalidateQueries({ queryKey: ["ignore-windows"] });
  await queryClient.invalidateQueries({ queryKey: ["feed-ignore-windows"] });
  await queryClient.invalidateQueries({ queryKey: ["tag-ignore-windows"] });
};

export const deleteIgnoreWindow = ignoreWindowDelete;

export const manageFeedIgnoreWindows = async (
  params: ManageFeedIgnoreWindowsRequest,
) => {
  await feedIgnoreWindowsManage(params);
  await queryClient.invalidateQueries({ queryKey: ["feed-ignore-windows"] });
  await queryClient.invalidateQueries({ queryKey: ["feeds"] });
};

export const manageTagIgnoreWindows = async (
  params: ManageTagIgnoreWindowsRequest,
) => {
  await tagIgnoreWindowsManage(params);
  await queryClient.invalidateQueries({ queryKey: ["tag-ignore-windows"] });
  await queryClient.invalidateQueries({ queryKey: ["tags"] });
};

function getLocalTimeInTimezone(
  date: Date,
  timezone: string,
): { weekday: number; hours: number; minutes: number } {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    let weekdayStr = "";
    let hourStr = "0";
    let minuteStr = "0";
    for (const part of parts) {
      if (part.type === "weekday") weekdayStr = part.value;
      if (part.type === "hour") hourStr = part.value;
      if (part.type === "minute") minuteStr = part.value;
    }
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    let hours = parseInt(hourStr, 10);
    if (hours === 24) hours = 0;
    const minutes = parseInt(minuteStr, 10);
    return {
      weekday: weekdayMap[weekdayStr] ?? date.getUTCDay(),
      hours,
      minutes,
    };
  } catch {
    return {
      weekday: date.getUTCDay(),
      hours: date.getUTCHours(),
      minutes: date.getUTCMinutes(),
    };
  }
}

export function isIgnoreWindowActive(
  window: Pick<
    IgnoreWindow,
    "startTime" | "endTime" | "daysOfWeek" | "timezone"
  >,
  date: Date = new Date(),
): boolean {
  if (!window.daysOfWeek || window.daysOfWeek.length === 0) return false;

  const { weekday, hours, minutes } = getLocalTimeInTimezone(
    date,
    window.timezone || "UTC",
  );
  const currMinutes = hours * 60 + minutes;

  const [startH, startM] = window.startTime.split(":").map(Number);
  const [endH, endM] = window.endTime.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes =
    window.endTime === "24:00" || (endH === 24 && endM === 0)
      ? 1440
      : endH * 60 + endM;

  // All-day: 00:00 to 00:00 or 00:00 to 24:00
  if (
    (startMinutes === 0 && endMinutes === 0) ||
    (startMinutes === 0 && endMinutes === 1440)
  ) {
    return window.daysOfWeek.includes(weekday);
  }

  // Intraday (start < end)
  if (startMinutes < endMinutes) {
    if (!window.daysOfWeek.includes(weekday)) return false;
    return currMinutes >= startMinutes && currMinutes < endMinutes;
  }

  // Overnight (start > end)
  if (startMinutes > endMinutes) {
    // Evening part
    if (window.daysOfWeek.includes(weekday) && currMinutes >= startMinutes) {
      return true;
    }
    // Morning part
    const yesterdayWeekday = (weekday + 6) % 7;
    if (
      window.daysOfWeek.includes(yesterdayWeekday) &&
      currMinutes < endMinutes
    ) {
      return true;
    }
    return false;
  }

  return false;
}

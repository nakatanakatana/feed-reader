import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as feedIgnoreWindowsListClient from "./api/generated/client/feedIgnoreWindowsList";
import * as feedIgnoreWindowsManageClient from "./api/generated/client/feedIgnoreWindowsManage";
import * as ignoreWindowsCreateClient from "./api/generated/client/ignoreWindowsCreate";
import * as ignoreWindowsDeleteClient from "./api/generated/client/ignoreWindowsDelete";
import * as ignoreWindowsListClient from "./api/generated/client/ignoreWindowsList";
import * as ignoreWindowsUpdateClient from "./api/generated/client/ignoreWindowsUpdate";
import * as tagIgnoreWindowsListClient from "./api/generated/client/tagIgnoreWindowsList";
import * as tagIgnoreWindowsManageClient from "./api/generated/client/tagIgnoreWindowsManage";
import {
  feedIgnoreWindowsQueryOptions,
  ignoreWindowDelete,
  ignoreWindowInsert,
  ignoreWindowsQueryOptions,
  ignoreWindowUpdate,
  isIgnoreWindowActive,
  manageFeedIgnoreWindows,
  manageTagIgnoreWindows,
  mapOpenAPIIgnoreWindow,
  tagIgnoreWindowsQueryOptions,
} from "./ignore-window-db";
import { queryClient } from "./query";

describe("ignore-window-db", () => {
  beforeEach(() => {
    vi.spyOn(queryClient, "invalidateQueries");
    vi.spyOn(ignoreWindowsListClient, "ignoreWindowsList");
    vi.spyOn(ignoreWindowsCreateClient, "ignoreWindowsCreate");
    vi.spyOn(ignoreWindowsUpdateClient, "ignoreWindowsUpdate");
    vi.spyOn(ignoreWindowsDeleteClient, "ignoreWindowsDelete");
    vi.spyOn(feedIgnoreWindowsListClient, "feedIgnoreWindowsList");
    vi.spyOn(feedIgnoreWindowsManageClient, "feedIgnoreWindowsManage");
    vi.spyOn(tagIgnoreWindowsListClient, "tagIgnoreWindowsList");
    vi.spyOn(tagIgnoreWindowsManageClient, "tagIgnoreWindowsManage");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("mapOpenAPIIgnoreWindow", () => {
    it("maps openapi ignore window to domain object with parsed Date fields", () => {
      const mapped = mapOpenAPIIgnoreWindow({
        id: "w1",
        name: "Nightly Blackout",
        startTime: "23:00",
        endTime: "07:00",
        daysOfWeek: [1, 2, 3, 4, 5],
        timezone: "Asia/Tokyo",
        createdAt: "2026-08-20T10:00:00.000Z",
        updatedAt: "2026-08-20T12:00:00.000Z",
      });

      expect(mapped).toEqual({
        id: "w1",
        name: "Nightly Blackout",
        startTime: "23:00",
        endTime: "07:00",
        daysOfWeek: [1, 2, 3, 4, 5],
        timezone: "Asia/Tokyo",
        createdAt: new Date("2026-08-20T10:00:00.000Z"),
        updatedAt: new Date("2026-08-20T12:00:00.000Z"),
      });
    });
  });

  describe("ignoreWindowsQueryOptions", () => {
    it("has correct queryKey", () => {
      expect(ignoreWindowsQueryOptions.queryKey).toEqual(["ignore-windows"]);
    });

    it("fetches and maps ignore windows using ignoreWindowsList", async () => {
      vi.mocked(
        ignoreWindowsListClient.ignoreWindowsList,
      ).mockResolvedValueOnce({
        ignoreWindows: [
          {
            id: "w1",
            name: "Work Hours",
            startTime: "09:00",
            endTime: "17:00",
            daysOfWeek: [1, 2, 3, 4, 5],
            timezone: "UTC",
            createdAt: "2026-08-20T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
        ],
      });

      const result = await ignoreWindowsQueryOptions.queryFn();

      expect(ignoreWindowsListClient.ignoreWindowsList).toHaveBeenCalledTimes(
        1,
      );
      expect(result).toEqual([
        {
          id: "w1",
          name: "Work Hours",
          startTime: "09:00",
          endTime: "17:00",
          daysOfWeek: [1, 2, 3, 4, 5],
          timezone: "UTC",
          createdAt: new Date("2026-08-20T00:00:00.000Z"),
          updatedAt: new Date("2026-08-20T00:00:00.000Z"),
        },
      ]);
    });
  });

  describe("ignoreWindowInsert", () => {
    it("calls ignoreWindowsCreate and invalidates ignore-windows query", async () => {
      const payload = {
        name: "Weekend",
        startTime: "00:00",
        endTime: "23:59",
        daysOfWeek: [0, 6],
        timezone: "America/New_York",
      };

      vi.mocked(
        ignoreWindowsCreateClient.ignoreWindowsCreate,
      ).mockResolvedValueOnce({
        ignoreWindow: {
          id: "w2",
          ...payload,
          createdAt: "2026-08-20T00:00:00.000Z",
          updatedAt: "2026-08-20T00:00:00.000Z",
        },
      });

      const result = await ignoreWindowInsert(payload);

      expect(
        ignoreWindowsCreateClient.ignoreWindowsCreate,
      ).toHaveBeenCalledWith(payload);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["ignore-windows"],
      });
      expect(result.id).toBe("w2");
      expect(result.name).toBe("Weekend");
    });
  });

  describe("ignoreWindowUpdate", () => {
    it("calls ignoreWindowsUpdate and invalidates ignore-windows query", async () => {
      const updateData = {
        name: "Updated Weekend",
        startTime: "01:00",
      };

      vi.mocked(
        ignoreWindowsUpdateClient.ignoreWindowsUpdate,
      ).mockResolvedValueOnce({
        ignoreWindow: {
          id: "w2",
          name: "Updated Weekend",
          startTime: "01:00",
          endTime: "23:59",
          daysOfWeek: [0, 6],
          timezone: "America/New_York",
          createdAt: "2026-08-20T00:00:00.000Z",
          updatedAt: "2026-08-20T01:00:00.000Z",
        },
      });

      const result = await ignoreWindowUpdate("w2", updateData);

      expect(
        ignoreWindowsUpdateClient.ignoreWindowsUpdate,
      ).toHaveBeenCalledWith("w2", updateData);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["ignore-windows"],
      });
      expect(result.name).toBe("Updated Weekend");
      expect(result.startTime).toBe("01:00");
    });
  });

  describe("ignoreWindowDelete", () => {
    it("calls ignoreWindowsDelete and invalidates ignore-windows, feed-ignore-windows, tag-ignore-windows", async () => {
      vi.mocked(
        ignoreWindowsDeleteClient.ignoreWindowsDelete,
      ).mockResolvedValueOnce({});

      await ignoreWindowDelete("w2");

      expect(
        ignoreWindowsDeleteClient.ignoreWindowsDelete,
      ).toHaveBeenCalledWith("w2");
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["ignore-windows"],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["feed-ignore-windows"],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["tag-ignore-windows"],
      });
    });
  });

  describe("manageFeedIgnoreWindows", () => {
    it("calls feedIgnoreWindowsManage and invalidates feed-ignore-windows and feeds", async () => {
      const params = {
        feedIds: ["feed-1", "feed-2"],
        addIgnoreWindowIds: ["w1"],
        removeIgnoreWindowIds: ["w2"],
      };

      vi.mocked(
        feedIgnoreWindowsManageClient.feedIgnoreWindowsManage,
      ).mockResolvedValueOnce({});

      await manageFeedIgnoreWindows(params);

      expect(
        feedIgnoreWindowsManageClient.feedIgnoreWindowsManage,
      ).toHaveBeenCalledWith(params);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["feed-ignore-windows"],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["feeds"],
      });
    });
  });

  describe("manageTagIgnoreWindows", () => {
    it("calls tagIgnoreWindowsManage and invalidates tag-ignore-windows and tags", async () => {
      const params = {
        tagIds: ["tag-1"],
        addIgnoreWindowIds: ["w1"],
        removeIgnoreWindowIds: [],
      };

      vi.mocked(
        tagIgnoreWindowsManageClient.tagIgnoreWindowsManage,
      ).mockResolvedValueOnce({});

      await manageTagIgnoreWindows(params);

      expect(
        tagIgnoreWindowsManageClient.tagIgnoreWindowsManage,
      ).toHaveBeenCalledWith(params);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["tag-ignore-windows"],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["tags"],
      });
    });
  });

  describe("feedIgnoreWindowsQueryOptions", () => {
    it("creates query options without params", async () => {
      const opts = feedIgnoreWindowsQueryOptions();
      expect(opts.queryKey).toEqual(["feed-ignore-windows"]);

      vi.mocked(
        feedIgnoreWindowsListClient.feedIgnoreWindowsList,
      ).mockResolvedValueOnce({
        feedIgnoreWindows: [
          {
            feedId: "feed-1",
            ignoreWindowId: "w1",
          },
        ],
      });

      const result = await opts.queryFn();

      expect(
        feedIgnoreWindowsListClient.feedIgnoreWindowsList,
      ).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([
        {
          id: "feed-1-w1",
          feedId: "feed-1",
          ignoreWindowId: "w1",
        },
      ]);
    });

    it("creates query options with filtering params", async () => {
      const opts = feedIgnoreWindowsQueryOptions({ feedId: "feed-1" });
      expect(opts.queryKey).toEqual([
        "feed-ignore-windows",
        { feedId: "feed-1" },
      ]);

      vi.mocked(
        feedIgnoreWindowsListClient.feedIgnoreWindowsList,
      ).mockResolvedValueOnce({
        feedIgnoreWindows: [
          {
            feedId: "feed-1",
            ignoreWindowId: "w1",
          },
        ],
      });

      const result = await opts.queryFn();

      expect(
        feedIgnoreWindowsListClient.feedIgnoreWindowsList,
      ).toHaveBeenCalledWith({
        feedId: "feed-1",
      });
      expect(result).toEqual([
        {
          id: "feed-1-w1",
          feedId: "feed-1",
          ignoreWindowId: "w1",
        },
      ]);
    });
  });

  describe("tagIgnoreWindowsQueryOptions", () => {
    it("creates query options without params", async () => {
      const opts = tagIgnoreWindowsQueryOptions();
      expect(opts.queryKey).toEqual(["tag-ignore-windows"]);

      vi.mocked(
        tagIgnoreWindowsListClient.tagIgnoreWindowsList,
      ).mockResolvedValueOnce({
        tagIgnoreWindows: [
          {
            tagId: "tag-1",
            ignoreWindowId: "w1",
          },
        ],
      });

      const result = await opts.queryFn();

      expect(
        tagIgnoreWindowsListClient.tagIgnoreWindowsList,
      ).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([
        {
          id: "tag-1-w1",
          tagId: "tag-1",
          ignoreWindowId: "w1",
        },
      ]);
    });

    it("creates query options with filtering params", async () => {
      const opts = tagIgnoreWindowsQueryOptions({ tagId: "tag-1" });
      expect(opts.queryKey).toEqual(["tag-ignore-windows", { tagId: "tag-1" }]);

      vi.mocked(
        tagIgnoreWindowsListClient.tagIgnoreWindowsList,
      ).mockResolvedValueOnce({
        tagIgnoreWindows: [
          {
            tagId: "tag-1",
            ignoreWindowId: "w1",
          },
        ],
      });

      const result = await opts.queryFn();

      expect(
        tagIgnoreWindowsListClient.tagIgnoreWindowsList,
      ).toHaveBeenCalledWith({
        tagId: "tag-1",
      });
      expect(result).toEqual([
        {
          id: "tag-1-w1",
          tagId: "tag-1",
          ignoreWindowId: "w1",
        },
      ]);
    });
  });

  describe("isIgnoreWindowActive", () => {
    it("returns true for intraday window when current time is within range and day matches", () => {
      const window = {
        id: "w1",
        name: "Work Hours",
        startTime: "09:00",
        endTime: "17:00",
        daysOfWeek: [1, 2, 3, 4, 5],
        timezone: "UTC",
      };

      // 2026-08-24 is Monday, 12:00 UTC
      const mondayNoon = new Date("2026-08-24T12:00:00Z");
      expect(isIgnoreWindowActive(window, mondayNoon)).toBe(true);

      // 2026-08-24 Monday, 08:59 UTC (before start)
      const mondayEarly = new Date("2026-08-24T08:59:00Z");
      expect(isIgnoreWindowActive(window, mondayEarly)).toBe(false);

      // 2026-08-24 Monday, 17:00 UTC (at end)
      const mondayEnd = new Date("2026-08-24T17:00:00Z");
      expect(isIgnoreWindowActive(window, mondayEnd)).toBe(false);

      // 2026-08-23 Sunday, 12:00 UTC (not in daysOfWeek)
      const sundayNoon = new Date("2026-08-23T12:00:00Z");
      expect(isIgnoreWindowActive(window, sundayNoon)).toBe(false);
    });

    it("returns true for overnight window during evening and morning parts", () => {
      const window = {
        id: "w2",
        name: "Night Window",
        startTime: "23:00",
        endTime: "07:00",
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
        timezone: "UTC",
      };

      // Monday 23:30 UTC -> evening part
      const mondayNight = new Date("2026-08-24T23:30:00Z");
      expect(isIgnoreWindowActive(window, mondayNight)).toBe(true);

      // Tuesday 05:00 UTC -> morning part of Monday night
      const tuesdayMorning = new Date("2026-08-25T05:00:00Z");
      expect(isIgnoreWindowActive(window, tuesdayMorning)).toBe(true);

      // Tuesday 07:00 UTC -> at end time
      const tuesday7am = new Date("2026-08-25T07:00:00Z");
      expect(isIgnoreWindowActive(window, tuesday7am)).toBe(false);

      // Monday 05:00 UTC -> Sunday night was not active
      const mondayEarlyMorning = new Date("2026-08-24T05:00:00Z");
      expect(isIgnoreWindowActive(window, mondayEarlyMorning)).toBe(false);
    });

    it("handles all-day windows (00:00 to 24:00 and 00:00 to 00:00)", () => {
      const window = {
        id: "w3",
        name: "Weekend All Day",
        startTime: "00:00",
        endTime: "24:00",
        daysOfWeek: [0, 6], // Sun, Sat
        timezone: "UTC",
      };

      // 2026-08-23 is Sunday
      expect(
        isIgnoreWindowActive(window, new Date("2026-08-23T15:00:00Z")),
      ).toBe(true);
      // 2026-08-24 is Monday
      expect(
        isIgnoreWindowActive(window, new Date("2026-08-24T15:00:00Z")),
      ).toBe(false);

      const windowZeroZero = {
        ...window,
        endTime: "00:00",
      };
      expect(
        isIgnoreWindowActive(windowZeroZero, new Date("2026-08-23T23:59:00Z")),
      ).toBe(true);

      const sameNonZero = {
        ...window,
        startTime: "09:00",
        endTime: "09:00",
      };
      expect(
        isIgnoreWindowActive(sameNonZero, new Date("2026-08-23T12:00:00Z")),
      ).toBe(false);
    });

    it("evaluates correctly with specific timezones", () => {
      // Monday-Friday 09:00 to 17:00 JST (JST is UTC+9)
      const window = {
        id: "w4",
        name: "Tokyo Work Hours",
        startTime: "09:00",
        endTime: "17:00",
        daysOfWeek: [1, 2, 3, 4, 5],
        timezone: "Asia/Tokyo",
      };

      // Monday 01:00 UTC = Monday 10:00 JST -> inside window
      expect(
        isIgnoreWindowActive(window, new Date("2026-08-24T01:00:00Z")),
      ).toBe(true);

      // Monday 09:00 UTC = Monday 18:00 JST -> outside window
      expect(
        isIgnoreWindowActive(window, new Date("2026-08-24T09:00:00Z")),
      ).toBe(false);
    });
  });
});

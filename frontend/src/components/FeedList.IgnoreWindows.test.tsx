import { QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as feedIgnoreWindowsListClient from "../lib/api/generated/client/feedIgnoreWindowsList";
import * as feedsListClient from "../lib/api/generated/client/feedsList";
import * as feedTagsListClient from "../lib/api/generated/client/feedTagsList";
import * as ignoreWindowsListClient from "../lib/api/generated/client/ignoreWindowsList";
import * as tagIgnoreWindowsListClient from "../lib/api/generated/client/tagIgnoreWindowsList";
import * as tagsListClient from "../lib/api/generated/client/tagsList";
import { queryClient } from "../lib/query";
import { FeedList } from "./FeedList";

describe("FeedList Ignore Windows Integration", () => {
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    vi.spyOn(feedsListClient, "feedsList").mockResolvedValue({
      feeds: [
        {
          id: "f1",
          title: "Alpha News",
          url: "https://example.com/alpha",
          tags: [],
          unreadCount: "0",
          createdAt: "2026-08-20T00:00:00.000Z",
          updatedAt: "2026-08-20T00:00:00.000Z",
        },
      ],
    });

    vi.spyOn(tagsListClient, "tagsList").mockResolvedValue({
      tags: [],
      totalUnreadCount: "0",
    });

    vi.spyOn(feedTagsListClient, "feedTagsList").mockResolvedValue({
      feedTags: [],
    });

    vi.spyOn(ignoreWindowsListClient, "ignoreWindowsList").mockResolvedValue({
      ignoreWindows: [
        {
          id: "w-active",
          name: "Always Blackout",
          startTime: "00:00",
          endTime: "24:00",
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          timezone: "UTC",
          createdAt: "2026-08-20T00:00:00.000Z",
          updatedAt: "2026-08-20T00:00:00.000Z",
        },
      ],
    });

    vi.spyOn(
      feedIgnoreWindowsListClient,
      "feedIgnoreWindowsList",
    ).mockResolvedValue({
      feedIgnoreWindows: [
        {
          feedId: "f1",
          ignoreWindowId: "w-active",
        },
      ],
    });

    vi.spyOn(
      tagIgnoreWindowsListClient,
      "tagIgnoreWindowsList",
    ).mockResolvedValue({
      tagIgnoreWindows: [],
    });
  });

  afterEach(() => {
    if (dispose) dispose();
    dispose = undefined;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  const renderComponent = () => {
    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <FeedList />
        </QueryClientProvider>
      ),
      document.body,
    );
  };

  it("renders active ignore window indicator badge on the feed item", async () => {
    renderComponent();

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("Alpha News");
      expect(document.body.textContent).toContain("Always Blackout");
      expect(document.body.textContent).toContain("💤 Always Blackout");
    });
  });

  it("allows bulk selection and opening ManageIgnoreWindowsModal", async () => {
    renderComponent();

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("Alpha News");
    });

    const checkbox = document.querySelector(
      'input[type="checkbox"]:not(#select-all-visible)',
    ) as HTMLInputElement;
    expect(checkbox).toBeDefined();

    checkbox.click();

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("1 feeds selected");
    });

    const bulkIgnoreWindowsBtn = Array.from(
      document.querySelectorAll("button"),
    ).find((b) => b.textContent?.trim() === "Ignore Windows");
    expect(bulkIgnoreWindowsBtn).toBeDefined();

    bulkIgnoreWindowsBtn?.click();

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain(
        "Manage Ignore Windows for 1 feeds",
      );
    });
  });
});

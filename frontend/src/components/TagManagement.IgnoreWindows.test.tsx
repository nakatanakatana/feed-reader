import { QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as ignoreWindowsListClient from "../lib/api/generated/client/ignoreWindowsList";
import * as tagIgnoreWindowsListClient from "../lib/api/generated/client/tagIgnoreWindowsList";
import * as tagsListClient from "../lib/api/generated/client/tagsList";
import { queryClient } from "../lib/query";
import { TagManagement } from "./TagManagement";

describe("TagManagement Ignore Windows Integration", () => {
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    vi.spyOn(tagsListClient, "tagsList").mockResolvedValue({
      tags: [
        {
          id: "tag-1",
          name: "Tech",
          feedCount: "2",
          unreadCount: "0",
          createdAt: "2026-08-20T00:00:00.000Z",
          updatedAt: "2026-08-20T00:00:00.000Z",
        },
      ],
      totalUnreadCount: "0",
    });

    vi.spyOn(ignoreWindowsListClient, "ignoreWindowsList").mockResolvedValue({
      ignoreWindows: [
        {
          id: "w1",
          name: "Nightly Quiet Hours",
          startTime: "23:00",
          endTime: "07:00",
          daysOfWeek: [1, 2, 3, 4, 5],
          timezone: "Asia/Tokyo",
          createdAt: "2026-08-20T00:00:00.000Z",
          updatedAt: "2026-08-20T00:00:00.000Z",
        },
      ],
    });

    vi.spyOn(
      tagIgnoreWindowsListClient,
      "tagIgnoreWindowsList",
    ).mockResolvedValue({
      tagIgnoreWindows: [
        {
          tagId: "tag-1",
          ignoreWindowId: "w1",
        },
      ],
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
          <TagManagement />
        </QueryClientProvider>
      ),
      document.body,
    );
  };

  it("displays attached ignore window badge for the tag", async () => {
    renderComponent();

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("Tech");
      expect(document.body.textContent).toContain("Nightly Quiet Hours");
    });
  });

  it("opens ManageIgnoreWindowsModal when clicking Ignore Windows button", async () => {
    renderComponent();

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("Tech");
    });

    const ignoreWindowsBtn = Array.from(
      document.querySelectorAll("button"),
    ).find((b) => b.textContent?.trim() === "Ignore Windows");
    expect(ignoreWindowsBtn).toBeDefined();

    ignoreWindowsBtn?.click();

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain(
        "Manage Ignore Windows for 1 tags",
      );
    });
  });
});

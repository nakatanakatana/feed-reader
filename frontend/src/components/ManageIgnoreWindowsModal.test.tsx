import { QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as ignoreWindowsListClient from "../lib/api/generated/client/ignoreWindowsList";
import type { IgnoreWindow } from "../lib/ignore-window-db";
import * as ignoreWindowDb from "../lib/ignore-window-db";
import { queryClient } from "../lib/query";
import { ManageIgnoreWindowsModal } from "./ManageIgnoreWindowsModal";

describe("ManageIgnoreWindowsModal", () => {
  let dispose: (() => void) | undefined;

  const mockWindows: IgnoreWindow[] = [
    {
      id: "w1",
      name: "Nightly Quiet Hours",
      startTime: "23:00",
      endTime: "07:00",
      daysOfWeek: [1, 2, 3, 4, 5],
      timezone: "Asia/Tokyo",
    },
    {
      id: "w2",
      name: "Weekend Blackout",
      startTime: "00:00",
      endTime: "24:00",
      daysOfWeek: [0, 6],
      timezone: "UTC",
    },
  ];

  beforeEach(() => {
    vi.spyOn(ignoreWindowsListClient, "ignoreWindowsList").mockResolvedValue({
      ignoreWindows: mockWindows.map((w) => ({
        ...w,
        createdAt: "2026-08-20T00:00:00.000Z",
        updatedAt: "2026-08-20T00:00:00.000Z",
      })),
    });
    vi.spyOn(ignoreWindowDb, "manageFeedIgnoreWindows").mockResolvedValue(
      undefined,
    );
    vi.spyOn(ignoreWindowDb, "manageTagIgnoreWindows").mockResolvedValue(
      undefined,
    );
  });

  afterEach(() => {
    if (dispose) dispose();
    dispose = undefined;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  const renderModal = (props: {
    isOpen?: boolean;
    onClose?: () => void;
    targetType: "feed" | "tag";
    feedIds?: string[];
    tagIds?: string[];
  }) => {
    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <ManageIgnoreWindowsModal
            isOpen={props.isOpen ?? true}
            onClose={props.onClose ?? vi.fn()}
            targetType={props.targetType}
            feedIds={props.feedIds}
            tagIds={props.tagIds}
          />
        </QueryClientProvider>
      ),
      document.body,
    );
  };

  it("renders modal with available ignore windows and feed count title", async () => {
    renderModal({
      targetType: "feed",
      feedIds: ["f1", "f2"],
    });

    // Wait for query to resolve
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain(
        "Manage Ignore Windows for 2 feeds",
      );
      expect(document.body.textContent).toContain("Nightly Quiet Hours");
      expect(document.body.textContent).toContain("Weekend Blackout");
      expect(document.body.textContent).toContain("All day (24h)");
    });
  });

  it("renders modal with tag count title for targetType='tag'", async () => {
    renderModal({
      targetType: "tag",
      tagIds: ["t1"],
    });

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain(
        "Manage Ignore Windows for 1 tags",
      );
      expect(document.body.textContent).toContain("Nightly Quiet Hours");
    });
  });

  it("disables save button when no rules are selected to add or remove", async () => {
    renderModal({
      targetType: "feed",
      feedIds: ["f1"],
    });

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("Nightly Quiet Hours");
    });

    const saveBtn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Save Changes",
    );
    expect(saveBtn).toBeDefined();
    expect(saveBtn?.disabled).toBe(true);
  });

  it("selects rules to add and remove and calls manageFeedIgnoreWindows for feeds", async () => {
    const onClose = vi.fn();
    renderModal({
      targetType: "feed",
      feedIds: ["f1", "f2"],
      onClose,
    });

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("Nightly Quiet Hours");
    });

    // Find add button for first window (w1) and remove button for second window (w2)
    const rows = document.querySelectorAll("[data-ignore-window-id]");
    expect(rows.length).toBe(2);

    const w1AddBtn = rows[0].querySelector(
      'button[data-action="add"]',
    ) as HTMLButtonElement;
    const w2RemoveBtn = rows[1].querySelector(
      'button[data-action="remove"]',
    ) as HTMLButtonElement;

    expect(w1AddBtn).toBeDefined();
    expect(w2RemoveBtn).toBeDefined();

    w1AddBtn.click();
    w2RemoveBtn.click();

    const saveBtn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Save Changes",
    ) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);

    saveBtn.click();

    await vi.waitFor(() => {
      expect(ignoreWindowDb.manageFeedIgnoreWindows).toHaveBeenCalledWith({
        feedIds: ["f1", "f2"],
        addIgnoreWindowIds: ["w1"],
        removeIgnoreWindowIds: ["w2"],
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("selects rules and calls manageTagIgnoreWindows for tags", async () => {
    const onClose = vi.fn();
    renderModal({
      targetType: "tag",
      tagIds: ["t1"],
      onClose,
    });

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("Nightly Quiet Hours");
    });

    const rows = document.querySelectorAll("[data-ignore-window-id]");
    const w1AddBtn = rows[0].querySelector(
      'button[data-action="add"]',
    ) as HTMLButtonElement;

    w1AddBtn.click();

    const saveBtn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Save Changes",
    ) as HTMLButtonElement;
    saveBtn.click();

    await vi.waitFor(() => {
      expect(ignoreWindowDb.manageTagIgnoreWindows).toHaveBeenCalledWith({
        tagIds: ["t1"],
        addIgnoreWindowIds: ["w1"],
        removeIgnoreWindowIds: [],
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("toggles add and remove selection correctly", async () => {
    renderModal({
      targetType: "feed",
      feedIds: ["f1"],
    });

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("Nightly Quiet Hours");
    });

    const row = document.querySelector(
      "[data-ignore-window-id='w1']",
    ) as HTMLElement;
    const addBtn = row.querySelector(
      'button[data-action="add"]',
    ) as HTMLButtonElement;
    const removeBtn = row.querySelector(
      'button[data-action="remove"]',
    ) as HTMLButtonElement;

    // Click Add
    addBtn.click();
    // Clicking Remove should switch from Add to Remove
    removeBtn.click();
    // Clicking Remove again should unselect
    removeBtn.click();

    const saveBtn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Save Changes",
    ) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("calls onClose when cancel button is clicked", async () => {
    const onClose = vi.fn();
    renderModal({
      targetType: "feed",
      feedIds: ["f1"],
      onClose,
    });

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("Nightly Quiet Hours");
    });

    const cancelBtn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Cancel",
    );
    cancelBtn?.click();

    expect(onClose).toHaveBeenCalled();
  });
});

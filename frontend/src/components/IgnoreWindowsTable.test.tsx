import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IgnoreWindow } from "../lib/ignore-window-db";
import {
  IgnoreWindowsTable,
  formatDaysOfWeek,
  formatTimeRange,
} from "./IgnoreWindowsTable";

describe("IgnoreWindowsTable", () => {
  let dispose: (() => void) | undefined;

  afterEach(() => {
    if (dispose) dispose();
    dispose = undefined;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  const mockWindows: IgnoreWindow[] = [
    {
      id: "w1",
      name: "Nightly Blackout",
      startTime: "23:00",
      endTime: "07:00",
      daysOfWeek: [1, 2, 3, 4, 5],
      timezone: "Asia/Tokyo",
    },
    {
      id: "w2",
      name: "Weekend Quiet Time",
      startTime: "00:00",
      endTime: "24:00",
      daysOfWeek: [0, 6],
      timezone: "UTC",
    },
    {
      id: "w3",
      name: "Everyday Pause",
      startTime: "12:00",
      endTime: "13:00",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      timezone: "America/New_York",
    },
  ];

  describe("formatDaysOfWeek", () => {
    it("formats all days as 'Every day'", () => {
      expect(formatDaysOfWeek([0, 1, 2, 3, 4, 5, 6])).toBe("Every day");
    });

    it("formats weekdays correctly", () => {
      expect(formatDaysOfWeek([1, 2, 3, 4, 5])).toBe("Mon, Tue, Wed, Thu, Fri");
    });

    it("formats weekends correctly", () => {
      expect(formatDaysOfWeek([0, 6])).toBe("Sun, Sat");
    });

    it("formats custom days list correctly", () => {
      expect(formatDaysOfWeek([1, 3, 5])).toBe("Mon, Wed, Fri");
    });

    it("handles empty days list", () => {
      expect(formatDaysOfWeek([])).toBe("None");
    });
  });

  describe("formatTimeRange", () => {
    it("formats 00:00 - 24:00 as All day (24h)", () => {
      expect(formatTimeRange("00:00", "24:00")).toBe("All day (24h)");
    });

    it("formats 00:00 - 00:00 as All day (24h)", () => {
      expect(formatTimeRange("00:00", "00:00")).toBe("All day (24h)");
    });

    it("formats standard time range", () => {
      expect(formatTimeRange("23:00", "07:00")).toBe("23:00 - 07:00");
    });
  });

  it("renders ignore windows list with names, days, time ranges, and timezones", () => {
    dispose = render(
      () => (
        <IgnoreWindowsTable
          ignoreWindows={mockWindows}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      ),
      document.body,
    );

    expect(document.body.textContent).toContain("Nightly Blackout");
    expect(document.body.textContent).toContain("Weekend Quiet Time");
    expect(document.body.textContent).toContain("Everyday Pause");

    expect(document.body.textContent).toContain("23:00 - 07:00");
    expect(document.body.textContent).toContain("All day (24h)");
    expect(document.body.textContent).toContain("12:00 - 13:00");

    expect(document.body.textContent).toContain("Asia/Tokyo");
    expect(document.body.textContent).toContain("UTC");
    expect(document.body.textContent).toContain("America/New_York");
  });

  it("renders empty state when there are no ignore windows", () => {
    dispose = render(
      () => (
        <IgnoreWindowsTable
          ignoreWindows={[]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      ),
      document.body,
    );

    expect(document.body.textContent).toContain(
      "No ignore windows configured.",
    );
  });

  it("calls onEdit with the ignore window when edit button is clicked", () => {
    const onEdit = vi.fn();
    dispose = render(
      () => (
        <IgnoreWindowsTable
          ignoreWindows={mockWindows}
          onEdit={onEdit}
          onDelete={vi.fn()}
        />
      ),
      document.body,
    );

    const editButtons = document.querySelectorAll<HTMLButtonElement>(
      'button[data-action="edit"]',
    );
    expect(editButtons.length).toBeGreaterThanOrEqual(1);

    editButtons[0].click();
    expect(onEdit).toHaveBeenCalledWith(mockWindows[0]);
  });

  it("prompts confirmation and calls onDelete when delete button is clicked and confirmed", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onDelete = vi.fn();

    dispose = render(
      () => (
        <IgnoreWindowsTable
          ignoreWindows={mockWindows}
          onEdit={vi.fn()}
          onDelete={onDelete}
        />
      ),
      document.body,
    );

    const deleteButtons = document.querySelectorAll<HTMLButtonElement>(
      'button[data-action="delete"]',
    );
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1);

    deleteButtons[0].click();

    expect(confirmSpy).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith("w1");
  });

  it("does not call onDelete when delete confirmation is cancelled", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const onDelete = vi.fn();

    dispose = render(
      () => (
        <IgnoreWindowsTable
          ignoreWindows={mockWindows}
          onEdit={vi.fn()}
          onDelete={onDelete}
        />
      ),
      document.body,
    );

    const deleteButtons = document.querySelectorAll<HTMLButtonElement>(
      'button[data-action="delete"]',
    );
    deleteButtons[0].click();

    expect(confirmSpy).toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });
});

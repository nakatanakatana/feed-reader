import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IgnoreWindow } from "../lib/ignore-window-db";
import { AddIgnoreWindowModal } from "./AddIgnoreWindowModal";

describe("AddIgnoreWindowModal", () => {
  let dispose: (() => void) | undefined;

  afterEach(() => {
    if (dispose) dispose();
    dispose = undefined;
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const mockWindow: IgnoreWindow = {
    id: "w1",
    name: "Nightly Quiet Hours",
    startTime: "23:00",
    endTime: "07:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    timezone: "Asia/Tokyo",
  };

  it("renders form fields correctly in create mode", () => {
    dispose = render(
      () => (
        <AddIgnoreWindowModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      ),
      document.body,
    );

    expect(document.querySelector("#ignore-window-name")).not.toBeNull();
    expect(document.querySelector("#ignore-window-start-time")).not.toBeNull();
    expect(document.querySelector("#ignore-window-end-time")).not.toBeNull();
    expect(document.querySelector("#ignore-window-timezone")).not.toBeNull();

    // Check weekday toggle buttons/inputs exist
    const dayCheckboxes = document.querySelectorAll(
      'input[name="daysOfWeek"], button[data-day]',
    );
    expect(dayCheckboxes.length).toBe(7);

    // Title should indicate Add/New
    expect(document.body.textContent).toContain("Add Ignore Window");
  });

  it("pre-fills form fields in edit mode", () => {
    dispose = render(
      () => (
        <AddIgnoreWindowModal
          isOpen={true}
          initialData={mockWindow}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      ),
      document.body,
    );

    const nameInput = document.querySelector(
      "#ignore-window-name",
    ) as HTMLInputElement;
    const startTimeInput = document.querySelector(
      "#ignore-window-start-time",
    ) as HTMLInputElement;
    const endTimeInput = document.querySelector(
      "#ignore-window-end-time",
    ) as HTMLInputElement;
    const timezoneSelect = document.querySelector(
      "#ignore-window-timezone",
    ) as HTMLSelectElement;

    expect(nameInput.value).toBe("Nightly Quiet Hours");
    expect(startTimeInput.value).toBe("23:00");
    expect(endTimeInput.value).toBe("07:00");
    expect(timezoneSelect.value).toBe("Asia/Tokyo");

    // Title should indicate Edit
    expect(document.body.textContent).toContain("Edit Ignore Window");
  });

  it("validates form and disables submit when required fields are missing", () => {
    dispose = render(
      () => (
        <AddIgnoreWindowModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      ),
      document.body,
    );

    const submitBtn = document.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    const nameInput = document.querySelector(
      "#ignore-window-name",
    ) as HTMLInputElement;
    nameInput.value = "   ";
    nameInput.dispatchEvent(new Event("input", { bubbles: true }));

    expect(submitBtn.disabled).toBe(true);
  });

  it("submits form data correctly in create mode", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    dispose = render(
      () => (
        <AddIgnoreWindowModal isOpen={true} onClose={onClose} onSave={onSave} />
      ),
      document.body,
    );

    const nameInput = document.querySelector(
      "#ignore-window-name",
    ) as HTMLInputElement;
    nameInput.value = "Weekend Blackout";
    nameInput.dispatchEvent(new Event("input", { bubbles: true }));

    const startTimeInput = document.querySelector(
      "#ignore-window-start-time",
    ) as HTMLInputElement;
    startTimeInput.value = "00:00";
    startTimeInput.dispatchEvent(new Event("input", { bubbles: true }));

    const endTimeInput = document.querySelector(
      "#ignore-window-end-time",
    ) as HTMLInputElement;
    endTimeInput.value = "23:59";
    endTimeInput.dispatchEvent(new Event("input", { bubbles: true }));

    const timezoneSelect = document.querySelector(
      "#ignore-window-timezone",
    ) as HTMLSelectElement;
    timezoneSelect.value = "UTC";
    timezoneSelect.dispatchEvent(new Event("change", { bubbles: true }));

    // Uncheck all days then check Sunday (0) and Saturday (6)
    const dayInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[name="daysOfWeek"]'),
    );
    for (const input of dayInputs) {
      if (input.checked) {
        input.click();
      }
    }
    const sunInput = document.querySelector<HTMLInputElement>(
      'input[name="daysOfWeek"][value="0"]',
    );
    const satInput = document.querySelector<HTMLInputElement>(
      'input[name="daysOfWeek"][value="6"]',
    );
    sunInput?.click();
    satInput?.click();

    const form = document.querySelector("form") as HTMLFormElement;
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    expect(onSave).toHaveBeenCalledWith({
      name: "Weekend Blackout",
      startTime: "00:00",
      endTime: "23:59",
      daysOfWeek: [0, 6],
      timezone: "UTC",
    });
  });

  it("submits updated data in edit mode", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    dispose = render(
      () => (
        <AddIgnoreWindowModal
          isOpen={true}
          initialData={mockWindow}
          onClose={onClose}
          onSave={onSave}
        />
      ),
      document.body,
    );

    const nameInput = document.querySelector(
      "#ignore-window-name",
    ) as HTMLInputElement;
    nameInput.value = "Updated Nightly";
    nameInput.dispatchEvent(new Event("input", { bubbles: true }));

    const form = document.querySelector("form") as HTMLFormElement;
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    expect(onSave).toHaveBeenCalledWith({
      name: "Updated Nightly",
      startTime: "23:00",
      endTime: "07:00",
      daysOfWeek: [1, 2, 3, 4, 5],
      timezone: "Asia/Tokyo",
    });
  });

  it("calls onClose when cancel button is clicked", () => {
    const onClose = vi.fn();
    dispose = render(
      () => (
        <AddIgnoreWindowModal
          isOpen={true}
          onClose={onClose}
          onSave={vi.fn()}
        />
      ),
      document.body,
    );

    const cancelBtn = document.querySelector(
      'button[data-action="cancel"]',
    ) as HTMLButtonElement;
    cancelBtn?.click();

    expect(onClose).toHaveBeenCalled();
  });

  it("shows pending state when isPending is true", () => {
    dispose = render(
      () => (
        <AddIgnoreWindowModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          isPending={true}
        />
      ),
      document.body,
    );

    const submitBtn = document.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
    expect(submitBtn.textContent).toContain("Saving...");
  });

  it("toggles all-day mode and sets 00:00 to 24:00 with inputs disabled", () => {
    dispose = render(
      () => (
        <AddIgnoreWindowModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      ),
      document.body,
    );

    const allDayCheckbox = document.querySelector(
      "#ignore-window-all-day",
    ) as HTMLInputElement;
    const startTimeInput = document.querySelector(
      "#ignore-window-start-time",
    ) as HTMLInputElement;
    const endTimeInput = document.querySelector(
      "#ignore-window-end-time",
    ) as HTMLInputElement;

    expect(allDayCheckbox.checked).toBe(false);
    allDayCheckbox.checked = true;
    allDayCheckbox.dispatchEvent(new Event("change", { bubbles: true }));

    expect(startTimeInput.value).toBe("00:00");
    expect(endTimeInput.value).toBe("24:00");
    expect(startTimeInput.disabled).toBe(true);
    expect(endTimeInput.disabled).toBe(true);
  });

  it("restores custom times when all-day mode is toggled off", () => {
    dispose = render(
      () => (
        <AddIgnoreWindowModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      ),
      document.body,
    );

    const allDayCheckbox = document.querySelector(
      "#ignore-window-all-day",
    ) as HTMLInputElement;
    const startTimeInput = document.querySelector(
      "#ignore-window-start-time",
    ) as HTMLInputElement;
    const endTimeInput = document.querySelector(
      "#ignore-window-end-time",
    ) as HTMLInputElement;

    startTimeInput.value = "09:30";
    startTimeInput.dispatchEvent(new Event("input", { bubbles: true }));
    endTimeInput.value = "18:45";
    endTimeInput.dispatchEvent(new Event("input", { bubbles: true }));

    // Toggle All-Day ON
    allDayCheckbox.checked = true;
    allDayCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
    expect(startTimeInput.value).toBe("00:00");
    expect(endTimeInput.value).toBe("24:00");

    // Toggle All-Day OFF -> should restore 09:30 and 18:45
    allDayCheckbox.checked = false;
    allDayCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
    expect(startTimeInput.value).toBe("09:30");
    expect(endTimeInput.value).toBe("18:45");
    expect(startTimeInput.disabled).toBe(false);
    expect(endTimeInput.disabled).toBe(false);
  });

  it("includes initial timezone even if not in common timezones list", () => {
    const customTzWindow: IgnoreWindow = {
      id: "w-kolkata",
      name: "India Office Window",
      startTime: "10:00",
      endTime: "19:00",
      daysOfWeek: [1, 2, 3, 4, 5],
      timezone: "Asia/Kolkata",
    };

    dispose = render(
      () => (
        <AddIgnoreWindowModal
          isOpen={true}
          initialData={customTzWindow}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      ),
      document.body,
    );

    const timezoneSelect = document.querySelector(
      "#ignore-window-timezone",
    ) as HTMLSelectElement;
    expect(timezoneSelect.value).toBe("Asia/Kolkata");
    const options = Array.from(timezoneSelect.options).map((o) => o.value);
    expect(options).toContain("Asia/Kolkata");
  });
});

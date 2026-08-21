import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import type { IgnoreWindow } from "../lib/ignore-window-db";
import { ActionButton } from "./ui/ActionButton";
import { Modal } from "./ui/Modal";

export interface IgnoreWindowFormData {
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  timezone: string;
}

export interface AddIgnoreWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: IgnoreWindowFormData) => Promise<void> | void;
  initialData?: IgnoreWindow | null;
  isPending?: boolean;
}

const DAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

const COMMON_TIMEZONES = [
  "UTC",
  "Asia/Tokyo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Australia/Sydney",
];

export function AddIgnoreWindowModal(props: AddIgnoreWindowModalProps) {
  const [name, setName] = createSignal("");
  const [isAllDay, setIsAllDay] = createSignal(false);
  const [startTime, setStartTime] = createSignal("23:00");
  const [endTime, setEndTime] = createSignal("07:00");
  const [previousCustomTimes, setPreviousCustomTimes] = createSignal<{
    startTime: string;
    endTime: string;
  }>({ startTime: "23:00", endTime: "07:00" });
  const [daysOfWeek, setDaysOfWeek] = createSignal<number[]>([1, 2, 3, 4, 5]);
  const [timezone, setTimezone] = createSignal(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  const availableTimezones = createMemo(() => {
    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const set = new Set(COMMON_TIMEZONES);
    if (localTz) {
      set.add(localTz);
    }
    if (props.initialData?.timezone) {
      set.add(props.initialData.timezone);
    }
    const currentTz = timezone();
    if (currentTz) {
      set.add(currentTz);
    }
    return Array.from(set).sort();
  });

  createEffect(() => {
    if (props.isOpen) {
      if (props.initialData) {
        setName(props.initialData.name);
        const allDay =
          props.initialData.startTime === "00:00" &&
          (props.initialData.endTime === "24:00" ||
            props.initialData.endTime === "00:00");
        setIsAllDay(allDay);
        setStartTime(props.initialData.startTime);
        setEndTime(props.initialData.endTime);
        if (!allDay) {
          setPreviousCustomTimes({
            startTime: props.initialData.startTime,
            endTime: props.initialData.endTime,
          });
        } else {
          setPreviousCustomTimes({ startTime: "23:00", endTime: "07:00" });
        }
        setDaysOfWeek([...props.initialData.daysOfWeek]);
        setTimezone(props.initialData.timezone);
      } else {
        setName("");
        setIsAllDay(false);
        setStartTime("23:00");
        setEndTime("07:00");
        setPreviousCustomTimes({ startTime: "23:00", endTime: "07:00" });
        setDaysOfWeek([1, 2, 3, 4, 5]);
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
      }
      setErrorMessage(null);
    }
  });

  const toggleDay = (day: number) => {
    if (daysOfWeek().includes(day)) {
      setDaysOfWeek(daysOfWeek().filter((d) => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek(), day].sort((a, b) => a - b));
    }
  };

  const selectAllDays = () => setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
  const selectWeekdays = () => setDaysOfWeek([1, 2, 3, 4, 5]);
  const selectWeekends = () => setDaysOfWeek([0, 6]);

  const isValid = createMemo(() => {
    return (
      name().trim().length > 0 &&
      startTime().trim().length > 0 &&
      endTime().trim().length > 0 &&
      daysOfWeek().length > 0 &&
      timezone().trim().length > 0
    );
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!isValid() || props.isPending) return;

    try {
      await props.onSave({
        name: name().trim(),
        startTime: isAllDay() ? "00:00" : startTime(),
        endTime: isAllDay() ? "24:00" : endTime(),
        daysOfWeek: daysOfWeek(),
        timezone: timezone(),
      });
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save ignore window",
      );
    }
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      size="standard"
      title={props.initialData ? "Edit Ignore Window" : "Add Ignore Window"}
      ariaLabel={props.initialData ? "Edit Ignore Window" : "Add Ignore Window"}
      footer={
        <div
          class={flex({
            justifyContent: "flex-end",
            gap: "3",
            width: "full",
          })}
        >
          <ActionButton
            type="button"
            variant="secondary"
            onClick={props.onClose}
            data-action="cancel"
          >
            Cancel
          </ActionButton>
          <ActionButton
            type="submit"
            form="ignore-window-form"
            variant="primary"
            disabled={!isValid() || props.isPending}
          >
            {props.isPending
              ? "Saving..."
              : props.initialData
                ? "Save Changes"
                : "Add Ignore Window"}
          </ActionButton>
        </div>
      }
    >
      <form
        id="ignore-window-form"
        onSubmit={handleSubmit}
        class={stack({ gap: "4" })}
      >
        <Show when={errorMessage()}>
          <div
            class={css({
              p: "3",
              bg: "red.50",
              color: "red.700",
              rounded: "md",
              fontSize: "sm",
              border: "1px solid",
              borderColor: "red.200",
            })}
          >
            {errorMessage()}
          </div>
        </Show>

        <div class={stack({ gap: "1.5" })}>
          <label
            for="ignore-window-name"
            class={css({ fontSize: "sm", fontWeight: "medium" })}
          >
            Name
          </label>
          <input
            id="ignore-window-name"
            type="text"
            placeholder="e.g. Nightly Quiet Hours"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            class={css({
              px: "3",
              py: "2",
              border: "1px solid",
              borderColor: "gray.300",
              rounded: "md",
              fontSize: "sm",
              _focusVisible: { outlineColor: "blue.500" },
            })}
          />
        </div>

        <div class={stack({ gap: "1.5" })}>
          <div
            class={flex({
              justifyContent: "space-between",
              alignItems: "center",
            })}
          >
            <label class={css({ fontSize: "sm", fontWeight: "medium" })}>
              Days of Week
            </label>
            <div class={flex({ gap: "2" })}>
              <button
                type="button"
                onClick={selectAllDays}
                class={css({
                  fontSize: "xs",
                  color: "blue.600",
                  cursor: "pointer",
                  _hover: { textDecoration: "underline" },
                })}
              >
                All
              </button>
              <button
                type="button"
                onClick={selectWeekdays}
                class={css({
                  fontSize: "xs",
                  color: "blue.600",
                  cursor: "pointer",
                  _hover: { textDecoration: "underline" },
                })}
              >
                Weekdays
              </button>
              <button
                type="button"
                onClick={selectWeekends}
                class={css({
                  fontSize: "xs",
                  color: "blue.600",
                  cursor: "pointer",
                  _hover: { textDecoration: "underline" },
                })}
              >
                Weekends
              </button>
            </div>
          </div>
          <div class={flex({ gap: "2", flexWrap: "wrap" })}>
            <For each={DAYS}>
              {(day) => {
                const isSelected = () => daysOfWeek().includes(day.value);
                return (
                  <label
                    data-day={day.value}
                    class={css({
                      display: "flex",
                      alignItems: "center",
                      gap: "1.5",
                      px: "3",
                      py: "1.5",
                      rounded: "md",
                      fontSize: "sm",
                      border: "1px solid",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      borderColor: isSelected() ? "blue.500" : "gray.200",
                      bg: isSelected() ? "blue.50" : "white",
                      color: isSelected() ? "blue.700" : "gray.700",
                      fontWeight: isSelected() ? "medium" : "normal",
                    })}
                  >
                    <input
                      type="checkbox"
                      name="daysOfWeek"
                      value={day.value}
                      checked={isSelected()}
                      onChange={() => toggleDay(day.value)}
                      class={css({
                        accentColor: "blue.600",
                      })}
                    />
                    <span>{day.label}</span>
                  </label>
                );
              }}
            </For>
          </div>
        </div>

        <div class={flex({ alignItems: "center", gap: "2" })}>
          <label
            class={flex({
              alignItems: "center",
              gap: "2",
              cursor: "pointer",
              fontSize: "sm",
              fontWeight: "medium",
            })}
          >
            <input
              type="checkbox"
              id="ignore-window-all-day"
              checked={isAllDay()}
              onChange={(e) => {
                const checked = e.currentTarget.checked;
                if (checked) {
                  setPreviousCustomTimes({
                    startTime: startTime(),
                    endTime: endTime(),
                  });
                  setIsAllDay(true);
                  setStartTime("00:00");
                  setEndTime("24:00");
                } else {
                  setIsAllDay(false);
                  const prev = previousCustomTimes();
                  setStartTime(prev.startTime || "23:00");
                  setEndTime(prev.endTime || "07:00");
                }
              }}
              class={css({
                rounded: "sm",
                accentColor: "blue.600",
              })}
            />
            <span>All day (24 hours)</span>
          </label>
        </div>

        <div
          class={flex({
            gap: "4",
            flexDirection: { base: "column", xs: "row" },
            opacity: isAllDay() ? "0.6" : "1",
          })}
        >
          <div class={stack({ gap: "1.5", flex: 1 })}>
            <label
              for="ignore-window-start-time"
              class={css({ fontSize: "sm", fontWeight: "medium" })}
            >
              Start Time
            </label>
            <input
              id="ignore-window-start-time"
              type="time"
              disabled={isAllDay()}
              value={isAllDay() ? "00:00" : startTime()}
              onInput={(e) => setStartTime(e.currentTarget.value)}
              class={css({
                px: "3",
                py: "2",
                border: "1px solid",
                borderColor: "gray.300",
                rounded: "md",
                fontSize: "sm",
                _focusVisible: { outlineColor: "blue.500" },
                _disabled: { bg: "gray.100", cursor: "not-allowed" },
              })}
            />
          </div>
          <div class={stack({ gap: "1.5", flex: 1 })}>
            <label
              for="ignore-window-end-time"
              class={css({ fontSize: "sm", fontWeight: "medium" })}
            >
              End Time
            </label>
            <input
              id="ignore-window-end-time"
              type={isAllDay() ? "text" : "time"}
              disabled={isAllDay()}
              value={isAllDay() ? "24:00" : endTime()}
              onInput={(e) => setEndTime(e.currentTarget.value)}
              class={css({
                px: "3",
                py: "2",
                border: "1px solid",
                borderColor: "gray.300",
                rounded: "md",
                fontSize: "sm",
                _focusVisible: { outlineColor: "blue.500" },
                _disabled: { bg: "gray.100", cursor: "not-allowed" },
              })}
            />
          </div>
        </div>

        <div class={stack({ gap: "1.5" })}>
          <label
            for="ignore-window-timezone"
            class={css({ fontSize: "sm", fontWeight: "medium" })}
          >
            Timezone
          </label>
          <select
            id="ignore-window-timezone"
            value={timezone()}
            onChange={(e) => setTimezone(e.currentTarget.value)}
            class={css({
              px: "3",
              py: "2",
              border: "1px solid",
              borderColor: "gray.300",
              rounded: "md",
              fontSize: "sm",
              bg: "white",
              _focusVisible: { outlineColor: "blue.500" },
            })}
          >
            <For each={availableTimezones()}>
              {(tz) => <option value={tz}>{tz}</option>}
            </For>
          </select>
        </div>
      </form>
    </Modal>
  );
}

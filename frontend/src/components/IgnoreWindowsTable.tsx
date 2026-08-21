import { For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import type { IgnoreWindow } from "../lib/ignore-window-db";
import { createMediaQuery } from "../lib/use-media-query";
import { ActionButton } from "./ui/ActionButton";
import { EmptyState } from "./ui/EmptyState";

export interface IgnoreWindowsTableProps {
  ignoreWindows: IgnoreWindow[];
  onEdit?: (window: IgnoreWindow) => void;
  onDelete?: (id: string) => void | Promise<void>;
  isPending?: boolean;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatDaysOfWeek(days: number[]): string {
  if (!days || days.length === 0) return "None";
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) {
    return "Every day";
  }
  if (
    sorted.length === 5 &&
    sorted[0] === 1 &&
    sorted[1] === 2 &&
    sorted[2] === 3 &&
    sorted[3] === 4 &&
    sorted[4] === 5
  ) {
    return "Mon, Tue, Wed, Thu, Fri";
  }
  if (sorted.length === 2 && sorted[0] === 0 && sorted[1] === 6) {
    return "Sun, Sat";
  }
  return sorted.map((d) => DAY_LABELS[d] ?? d.toString()).join(", ");
}

export function formatTimeRange(startTime: string, endTime: string): string {
  if (
    (startTime === "00:00" && endTime === "24:00") ||
    (startTime === "00:00" && endTime === "00:00")
  ) {
    return "All day (24h)";
  }
  return `${startTime} - ${endTime}`;
}

export function IgnoreWindowsTable(props: IgnoreWindowsTableProps) {
  const isMobile = createMediaQuery("(max-width: 767px)");

  const handleDelete = (item: IgnoreWindow) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"?`,
    );
    if (confirmed) {
      props.onDelete?.(item.id);
    }
  };

  return (
    <div class={css({ width: "full", overflowX: "auto" })}>
      <Show
        when={props.ignoreWindows.length > 0}
        fallback={
          <EmptyState
            title="No ignore windows configured."
            description="Create an ignore window to skip fetching feeds during specific hours."
          />
        }
      >
        <Show
          when={isMobile()}
          fallback={
            /* Desktop Table View */
            <table
              class={css({
                width: "full",
                borderCollapse: "collapse",
                "& th, & td": {
                  textAlign: "left",
                  p: "3",
                  borderBottom: "1px solid",
                  borderColor: "gray.100",
                },
              })}
            >
              <thead>
                <tr class={css({ bg: "gray.50" })}>
                  <th class={css({ fontWeight: "semibold", fontSize: "sm" })}>
                    Name
                  </th>
                  <th class={css({ fontWeight: "semibold", fontSize: "sm" })}>
                    Days
                  </th>
                  <th class={css({ fontWeight: "semibold", fontSize: "sm" })}>
                    Time Range
                  </th>
                  <th class={css({ fontWeight: "semibold", fontSize: "sm" })}>
                    Timezone
                  </th>
                  <th
                    class={css({
                      textAlign: "right!",
                      whiteSpace: "nowrap",
                      fontWeight: "semibold",
                      fontSize: "sm",
                    })}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                <For each={props.ignoreWindows}>
                  {(item) => (
                    <tr class={css({ _hover: { bg: "gray.50" } })}>
                      <td class={css({ fontWeight: "medium" })}>{item.name}</td>
                      <td>
                        <span
                          class={css({
                            fontSize: "xs",
                            bg: "gray.100",
                            px: "2",
                            py: "0.5",
                            rounded: "full",
                            color: "gray.700",
                          })}
                        >
                          {formatDaysOfWeek(item.daysOfWeek)}
                        </span>
                      </td>
                      <td>
                        <code
                          class={css({
                            fontSize: "sm",
                            bg: "gray.50",
                            px: "1.5",
                            py: "0.5",
                            rounded: "sm",
                            color: "gray.800",
                          })}
                        >
                          {formatTimeRange(item.startTime, item.endTime)}
                        </code>
                      </td>
                      <td>
                        <span
                          class={css({ fontSize: "sm", color: "gray.600" })}
                        >
                          {item.timezone}
                        </span>
                      </td>
                      <td class={css({ textAlign: "right!" })}>
                        <div
                          class={flex({
                            gap: "2",
                            justifyContent: "flex-end",
                          })}
                        >
                          <Show when={props.onEdit}>
                            <ActionButton
                              variant="secondary"
                              size="sm"
                              data-action="edit"
                              onClick={() => props.onEdit?.(item)}
                              disabled={props.isPending}
                            >
                              Edit
                            </ActionButton>
                          </Show>
                          <Show when={props.onDelete}>
                            <ActionButton
                              variant="danger"
                              size="sm"
                              data-action="delete"
                              onClick={() => handleDelete(item)}
                              disabled={props.isPending}
                            >
                              Delete
                            </ActionButton>
                          </Show>
                        </div>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          }
        >
          {/* Mobile List View */}
          <ul class={stack({ gap: "3" })}>
            <For each={props.ignoreWindows}>
              {(item) => (
                <li
                  class={stack({
                    gap: "2",
                    p: "3",
                    border: "1px solid",
                    borderColor: "gray.200",
                    rounded: "md",
                    bg: "white",
                  })}
                >
                  <div
                    class={flex({
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    })}
                  >
                    <div class={stack({ gap: "1" })}>
                      <span class={css({ fontWeight: "bold" })}>
                        {item.name}
                      </span>
                      <div class={flex({ gap: "2", alignItems: "center" })}>
                        <span
                          class={css({
                            fontSize: "xs",
                            bg: "gray.100",
                            px: "2",
                            py: "0.5",
                            rounded: "full",
                            color: "gray.700",
                          })}
                        >
                          {formatDaysOfWeek(item.daysOfWeek)}
                        </span>
                        <span
                          class={css({ fontSize: "xs", color: "gray.500" })}
                        >
                          {item.timezone}
                        </span>
                      </div>
                      <div>
                        <code
                          class={css({
                            fontSize: "xs",
                            bg: "gray.50",
                            px: "1.5",
                            py: "0.5",
                            rounded: "sm",
                            color: "gray.800",
                          })}
                        >
                          {formatTimeRange(item.startTime, item.endTime)}
                        </code>
                      </div>
                    </div>
                  </div>
                  <div
                    class={flex({
                      gap: "2",
                      justifyContent: "flex-end",
                      pt: "2",
                      borderTop: "1px solid",
                      borderColor: "gray.100",
                    })}
                  >
                    <Show when={props.onEdit}>
                      <ActionButton
                        variant="secondary"
                        size="sm"
                        data-action="edit"
                        onClick={() => props.onEdit?.(item)}
                        disabled={props.isPending}
                      >
                        Edit
                      </ActionButton>
                    </Show>
                    <Show when={props.onDelete}>
                      <ActionButton
                        variant="danger"
                        size="sm"
                        data-action="delete"
                        onClick={() => handleDelete(item)}
                        disabled={props.isPending}
                      >
                        Delete
                      </ActionButton>
                    </Show>
                  </div>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Show>
    </div>
  );
}

import { createQuery, useMutation } from "@tanstack/solid-query";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import {
  ignoreWindowsQueryOptions,
  manageFeedIgnoreWindows,
  manageTagIgnoreWindows,
} from "../lib/ignore-window-db";
import { formatDaysOfWeek, formatTimeRange } from "./IgnoreWindowsTable";
import { ActionButton } from "./ui/ActionButton";
import { EmptyState } from "./ui/EmptyState";
import { Modal } from "./ui/Modal";

export interface ManageIgnoreWindowsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "feed" | "tag";
  feedIds?: string[];
  tagIds?: string[];
}

export function ManageIgnoreWindowsModal(props: ManageIgnoreWindowsModalProps) {
  const ignoreWindowsQuery = createQuery(() => ignoreWindowsQueryOptions);

  const manageFeedMutation = useMutation(() => ({
    mutationFn: (params: Parameters<typeof manageFeedIgnoreWindows>[0]) =>
      manageFeedIgnoreWindows(params),
  }));

  const manageTagMutation = useMutation(() => ({
    mutationFn: (params: Parameters<typeof manageTagIgnoreWindows>[0]) =>
      manageTagIgnoreWindows(params),
  }));

  const [addIgnoreWindowIds, setAddIgnoreWindowIds] = createSignal<string[]>(
    [],
  );
  const [removeIgnoreWindowIds, setRemoveIgnoreWindowIds] = createSignal<
    string[]
  >([]);

  createEffect(() => {
    if (props.isOpen) {
      setAddIgnoreWindowIds([]);
      setRemoveIgnoreWindowIds([]);
    }
  });

  const title = createMemo(() => {
    if (props.targetType === "feed") {
      return `Manage Ignore Windows for ${props.feedIds?.length ?? 0} feeds`;
    }
    return `Manage Ignore Windows for ${props.tagIds?.length ?? 0} tags`;
  });

  const isPending = () =>
    manageFeedMutation.isPending || manageTagMutation.isPending;

  const toggleAddWindow = (id: string) => {
    if (addIgnoreWindowIds().includes(id)) {
      setAddIgnoreWindowIds(addIgnoreWindowIds().filter((w) => w !== id));
    } else {
      setAddIgnoreWindowIds([...addIgnoreWindowIds(), id]);
      setRemoveIgnoreWindowIds(removeIgnoreWindowIds().filter((w) => w !== id));
    }
  };

  const toggleRemoveWindow = (id: string) => {
    if (removeIgnoreWindowIds().includes(id)) {
      setRemoveIgnoreWindowIds(removeIgnoreWindowIds().filter((w) => w !== id));
    } else {
      setRemoveIgnoreWindowIds([...removeIgnoreWindowIds(), id]);
      setAddIgnoreWindowIds(addIgnoreWindowIds().filter((w) => w !== id));
    }
  };

  const handleSave = async () => {
    try {
      if (props.targetType === "feed") {
        await manageFeedMutation.mutateAsync({
          feedIds: props.feedIds ?? [],
          addIgnoreWindowIds: addIgnoreWindowIds(),
          removeIgnoreWindowIds: removeIgnoreWindowIds(),
        });
      } else {
        await manageTagMutation.mutateAsync({
          tagIds: props.tagIds ?? [],
          addIgnoreWindowIds: addIgnoreWindowIds(),
          removeIgnoreWindowIds: removeIgnoreWindowIds(),
        });
      }
      setAddIgnoreWindowIds([]);
      setRemoveIgnoreWindowIds([]);
      props.onClose();
    } catch (e) {
      console.error("Failed to manage ignore windows", e);
    }
  };

  const ignoreWindowsList = () => ignoreWindowsQuery.data ?? [];

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      size="standard"
      title={title()}
      ariaLabel="Manage ignore windows"
      footer={
        <div
          class={flex({ justifyContent: "flex-end", gap: "3", width: "full" })}
        >
          <ActionButton variant="secondary" onClick={props.onClose}>
            Cancel
          </ActionButton>
          <ActionButton
            variant="primary"
            onClick={handleSave}
            disabled={
              isPending() ||
              (addIgnoreWindowIds().length === 0 &&
                removeIgnoreWindowIds().length === 0)
            }
          >
            {isPending() ? "Saving..." : "Save Changes"}
          </ActionButton>
        </div>
      }
    >
      <div class={stack({ gap: "4" })}>
        <p class={css({ fontSize: "sm", color: "gray.500" })}>
          Select ignore windows to attach to or detach from the selected{" "}
          {props.targetType === "feed" ? "feeds" : "tags"}.
        </p>

        <div class={stack({ gap: "2" })}>
          <h3 class={css({ fontSize: "md", fontWeight: "semibold" })}>
            Available Ignore Windows
          </h3>

          <Show
            when={ignoreWindowsList().length > 0}
            fallback={
              <EmptyState
                title="No ignore windows found."
                description="Configure ignore windows in the Ignore Windows settings page."
              />
            }
          >
            <div
              class={css({
                maxHeight: "60",
                overflowY: "auto",
                border: "1px solid",
                borderColor: "gray.200",
                rounded: "md",
              })}
            >
              <For each={ignoreWindowsList()}>
                {(window) => (
                  <div
                    data-ignore-window-id={window.id}
                    class={flex({
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "3",
                      borderBottom: "1px solid",
                      borderColor: "gray.100",
                      _last: { borderBottom: "none" },
                    })}
                  >
                    <div class={stack({ gap: "0.5" })}>
                      <span
                        class={css({ fontSize: "sm", fontWeight: "medium" })}
                      >
                        {window.name}
                      </span>
                      <div class={flex({ gap: "2", alignItems: "center" })}>
                        <span
                          class={css({
                            fontSize: "xs",
                            bg: "gray.100",
                            px: "1.5",
                            py: "0.5",
                            rounded: "full",
                            color: "gray.600",
                          })}
                        >
                          {formatDaysOfWeek(window.daysOfWeek)}
                        </span>
                        <span
                          class={css({ fontSize: "xs", color: "gray.500" })}
                        >
                          {formatTimeRange(window.startTime, window.endTime)} (
                          {window.timezone})
                        </span>
                      </div>
                    </div>
                    <div class={flex({ gap: "2" })}>
                      <ActionButton
                        size="sm"
                        data-action="add"
                        variant={
                          addIgnoreWindowIds().includes(window.id)
                            ? "primary"
                            : "secondary"
                        }
                        onClick={() => toggleAddWindow(window.id)}
                      >
                        Add
                      </ActionButton>
                      <ActionButton
                        size="sm"
                        data-action="remove"
                        variant={
                          removeIgnoreWindowIds().includes(window.id)
                            ? "danger"
                            : "secondary"
                        }
                        onClick={() => toggleRemoveWindow(window.id)}
                      >
                        Remove
                      </ActionButton>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>
    </Modal>
  );
}

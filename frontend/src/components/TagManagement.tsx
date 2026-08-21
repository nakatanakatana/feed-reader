import { createQuery } from "@tanstack/solid-query";
import { createMemo, createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import {
  feedTagsQueryOptions,
  getTagPicker,
  getTagsWithFeedCount,
  ignoreWindowsQueryOptions,
  tagDelete,
  tagIgnoreWindowsQueryOptions,
  tagInsert,
  tagsQueryOptions,
} from "../lib/db";
import { isReadOnly } from "../lib/readonly";
import { ManageIgnoreWindowsModal } from "./ManageIgnoreWindowsModal";
import { ActionButton } from "./ui/ActionButton";
import { Badge } from "./ui/Badge";
import { EmptyState } from "./ui/EmptyState";

export const TagManagement = () => {
  const [newTagName, setNewTagName] = createSignal("");
  const [selectedTagId, setSelectedTagId] = createSignal<string | null>(null);
  const [isIgnoreWindowsModalOpen, setIsIgnoreWindowsModalOpen] =
    createSignal(false);

  const rawTagsQuery = createQuery(() => tagsQueryOptions);
  const feedTagsQuery = createQuery(() => feedTagsQueryOptions);
  const ignoreWindowsQuery = createQuery(() => ignoreWindowsQueryOptions);
  const tagIgnoreWindowsQuery = createQuery(() =>
    tagIgnoreWindowsQueryOptions(),
  );

  const getIgnoreWindowsForTag = (tagId: string) => {
    const allWindows = ignoreWindowsQuery.data ?? [];
    if (allWindows.length === 0) return [];
    const tagLinks = (tagIgnoreWindowsQuery.data ?? []).filter(
      (tiw) => tiw.tagId === tagId,
    );
    const tagWindowIds = new Set(tagLinks.map((tiw) => tiw.ignoreWindowId));
    return allWindows.filter((w) => tagWindowIds.has(w.id));
  };

  const tagsWithFeedCount = createMemo(() => {
    return getTagsWithFeedCount(
      rawTagsQuery.data ?? [],
      feedTagsQuery.data ?? [],
    );
  });

  const tagsSorted = createMemo(() => {
    return getTagPicker(tagsWithFeedCount());
  });

  const handleCreateTag = async (e: Event) => {
    e.preventDefault();
    if (!newTagName()) return;

    try {
      await tagInsert(newTagName());
      setNewTagName("");
    } catch (err) {
      console.error("Failed to insert tag:", err);
    }
  };

  const handleDeleteTag = async (
    id: string,
    name: string,
    feedCount: bigint,
  ) => {
    if (feedCount > 0n) {
      const confirmed = confirm(
        `Delete "${name}"? It is used by ${feedCount.toString()} feed(s).`,
      );
      if (!confirmed) return;
    }

    try {
      await tagDelete(id);
    } catch (err) {
      console.error("Failed to delete tag:", err);
    }
  };

  return (
    <div class={stack({ gap: "4", height: "full", minHeight: 0 })}>
      <Show when={!isReadOnly()}>
        <div
          class={stack({
            gap: "3",
            bg: "white",
            p: "4",
            rounded: "md",
            shadow: "sm",
            border: "1px solid",
            borderColor: "gray.200",
          })}
        >
          <form
            onSubmit={handleCreateTag}
            class={flex({ gap: "3", alignItems: "center", flexWrap: "wrap" })}
          >
            <input
              type="text"
              value={newTagName()}
              onInput={(e) => setNewTagName(e.currentTarget.value)}
              placeholder="New tag name"
              class={css({
                flex: "1",
                minW: "220px",
                px: "3",
                py: "2",
                border: "1px solid",
                borderColor: "gray.300",
                rounded: "md",
                _focusVisible: { outlineColor: "blue.500" },
              })}
            />
            <ActionButton type="submit" variant="primary">
              Add Tag
            </ActionButton>
          </form>
        </div>
      </Show>

      <div
        class={css({
          display: "grid",
          gridTemplateColumns: "1fr auto auto",
          gap: "3",
          fontSize: "xs",
          color: "gray.500",
          backgroundColor: "gray.50",
          borderRadius: "md",
          paddingY: "2",
          textTransform: "uppercase",
          letterSpacing: "wide",
          px: "2",
        })}
      >
        <span>Tag</span>
        <span>Feeds</span>
        <span class={css({ textAlign: "right", fontWeight: "semibold" })}>
          {tagsSorted().length} tags
        </span>
      </div>

      <div
        class={stack({
          gap: "3",
          bg: "white",
          p: "4",
          rounded: "md",
          shadow: "sm",
          border: "1px solid",
          borderColor: "gray.200",
          flex: 1,
          minHeight: 0,
        })}
      >
        <div class={stack({ gap: "2", flex: 1, minHeight: 0 })}>
          <div
            class={stack({
              gap: "2",
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              paddingRight: "1",
            })}
          >
            <Show when={tagsSorted().length > 0}>
              <For each={tagsSorted()}>
                {(tag) => (
                  <div
                    class={css({
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      gap: "3",
                      alignItems: "center",
                      px: "3",
                      py: "2",
                      border: "1px solid",
                      borderColor: "gray.100",
                      rounded: "md",
                      _hover: { bg: "gray.50" },
                    })}
                  >
                    <div
                      class={flex({
                        gap: "2",
                        alignItems: "center",
                        flexWrap: "wrap",
                      })}
                    >
                      <span class={css({ fontWeight: "medium" })}>
                        {tag.name}
                      </span>
                      <For each={getIgnoreWindowsForTag(tag.id)}>
                        {(win) => (
                          <Badge title={`Ignore window: ${win.name}`}>
                            🕒 {win.name}
                          </Badge>
                        )}
                      </For>
                    </div>
                    <Badge>feed: {tag.feedCount.toString()}</Badge>
                    <Show when={!isReadOnly()}>
                      <div class={flex({ gap: "2", alignItems: "center" })}>
                        <ActionButton
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedTagId(tag.id);
                            setIsIgnoreWindowsModalOpen(true);
                          }}
                          ariaLabel={`Manage ignore windows for ${tag.name}`}
                        >
                          Ignore Windows
                        </ActionButton>
                        <ActionButton
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            handleDeleteTag(
                              tag.id,
                              tag.name,
                              tag.feedCount ? BigInt(tag.feedCount) : 0n,
                            )
                          }
                          ariaLabel={`Delete ${tag.name}`}
                        >
                          Delete
                        </ActionButton>
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </Show>
            <Show when={tagsSorted().length === 0}>
              <EmptyState
                title="No tags yet."
                description="Create one to get started."
              />
            </Show>
          </div>
        </div>
      </div>

      <Show when={!isReadOnly()}>
        <ManageIgnoreWindowsModal
          isOpen={isIgnoreWindowsModalOpen()}
          onClose={() => {
            setIsIgnoreWindowsModalOpen(false);
            setSelectedTagId(null);
          }}
          targetType="tag"
          tagIds={selectedTagId() ? [selectedTagId()!] : []}
        />
      </Show>
    </div>
  );
};

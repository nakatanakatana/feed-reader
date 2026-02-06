import { useLiveQuery } from "@tanstack/solid-db";
import { useMutation } from "@tanstack/solid-query";
import { createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { createTag, deleteTag, tags as tagsCollection } from "../lib/tag-db";
import { ActionButton } from "./ui/ActionButton";
import { Badge } from "./ui/Badge";
import { EmptyState } from "./ui/EmptyState";

export const TagManagement = () => {
  const [newTagName, setNewTagName] = createSignal("");

  const tagsQuery = useLiveQuery((q) => {
    return q.from({ tag: tagsCollection }).select(({ tag }) => ({ ...tag }));
  });

  const createTagMutation = useMutation(() => ({
    mutationFn: createTag,
  }));

  const deleteTagMutation = useMutation(() => ({
    mutationFn: deleteTag,
  }));

  const handleCreateTag = (e: Event) => {
    e.preventDefault();
    if (!newTagName()) return;
    createTagMutation.mutate(newTagName(), {
      onSuccess: () => setNewTagName(""),
    });
  };

  const handleDeleteTag = (id: string, name: string, feedCount: bigint) => {
    if (feedCount > 0n) {
      const confirmed = confirm(
        `Delete "${name}"? It is used by ${feedCount.toString()} feed(s).`,
      );
      if (!confirmed) return;
    }
    deleteTagMutation.mutate(id);
  };

  return (
    <div class={stack({ gap: "4", height: "full", minHeight: 0 })}>
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
          <ActionButton
            type="submit"
            variant="primary"
            disabled={createTagMutation.isPending}
          >
            {createTagMutation.isPending ? "Adding..." : "Add Tag"}
          </ActionButton>
        </form>
      </div>

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
          {tagsQuery().length} tags
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
            <Show when={tagsQuery().length > 0}>
              <For each={tagsQuery()}>
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
                    <span class={css({ fontWeight: "medium" })}>
                      {tag.name}
                    </span>
                    <Badge>{tag.unreadCount?.toString() ?? "0"}</Badge>
                    <ActionButton
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        handleDeleteTag(tag.id, tag.name, tag.unreadCount ?? 0n)
                      }
                      ariaLabel={`Delete ${tag.name}`}
                    >
                      Delete
                    </ActionButton>
                  </div>
                )}
              </For>
            </Show>
            <Show when={tagsQuery().length === 0}>
              <EmptyState
                title="No tags yet."
                description="Create one to get started."
              />
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
};

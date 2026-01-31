import { create } from "@bufbuild/protobuf";
import { createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import {
  CreateTagRequestSchema,
  DeleteTagRequestSchema,
} from "../gen/tag/v1/tag_pb";
import { useCreateTag, useDeleteTag, useTags } from "../lib/tag-query";

export const TagManagement = () => {
  const [newTagName, setNewTagName] = createSignal("");
  const tagsQuery = useTags();
  const createTagMutation = useCreateTag();
  const deleteTagMutation = useDeleteTag();

  const handleCreateTag = (e: Event) => {
    e.preventDefault();
    if (!newTagName()) return;
    createTagMutation.mutate(
      create(CreateTagRequestSchema, { name: newTagName() }),
      {
        onSuccess: () => setNewTagName(""),
      },
    );
  };

  const handleDeleteTag = (id: string, name: string, feedCount: bigint) => {
    if (feedCount > 0n) {
      const confirmed = confirm(
        `Delete "${name}"? It is used by ${feedCount.toString()} feed(s).`,
      );
      if (!confirmed) return;
    }
    deleteTagMutation.mutate(create(DeleteTagRequestSchema, { id }));
  };

  return (
    <div
      class={stack({
        gap: "4",
        bg: "white",
        p: "4",
        rounded: "md",
        shadow: "sm",
        border: "1px solid",
        borderColor: "gray.200",
      })}
    >
      <div
        class={flex({ alignItems: "center", justifyContent: "space-between" })}
      >
        <div class={stack({ gap: "1" })}>
          <h2 class={css({ fontSize: "xl", fontWeight: "semibold" })}>
            Manage Tags
          </h2>
          <p class={css({ fontSize: "sm", color: "gray.600" })}>
            Create, review, and delete tags.
          </p>
        </div>
        <div
          class={css({
            fontSize: "sm",
            color: "gray.600",
            bg: "gray.50",
            border: "1px solid",
            borderColor: "gray.200",
            px: "3",
            py: "1.5",
            rounded: "md",
          })}
        >
          {tagsQuery.data?.tags.length ?? 0} tags
        </div>
      </div>

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
        <button
          type="submit"
          disabled={createTagMutation.isPending}
          class={css({
            px: "4",
            py: "2",
            bg: "blue.600",
            color: "white",
            rounded: "md",
            fontWeight: "medium",
            cursor: "pointer",
            _hover: { bg: "blue.700" },
            _disabled: { opacity: 0.5, cursor: "not-allowed" },
          })}
        >
          {createTagMutation.isPending ? "Adding..." : "Add Tag"}
        </button>
      </form>

      <Show when={(tagsQuery.data?.tags.length ?? 0) > 0}>
        <div class={stack({ gap: "2" })}>
          <div
            class={css({
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: "3",
              fontSize: "xs",
              color: "gray.500",
              textTransform: "uppercase",
              letterSpacing: "wide",
              px: "2",
            })}
          >
            <span>Tag</span>
            <span>Feeds</span>
            <span></span>
          </div>
          <For each={tagsQuery.data?.tags}>
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
                <span class={css({ fontWeight: "medium" })}>{tag.name}</span>
                <span
                  class={css({
                    fontSize: "xs",
                    fontWeight: "bold",
                    color: "gray.700",
                    bg: "gray.100",
                    px: "2.5",
                    py: "0.5",
                    rounded: "full",
                    minWidth: "2.5rem",
                    textAlign: "center",
                  })}
                >
                  {tag.feedCount.toString()}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleDeleteTag(tag.id, tag.name, tag.feedCount)
                  }
                  class={css({
                    color: "red.500",
                    px: "2",
                    py: "1",
                    rounded: "md",
                    fontSize: "sm",
                    cursor: "pointer",
                    _hover: { bg: "red.50", textDecoration: "underline" },
                  })}
                  aria-label={`Delete ${tag.name}`}
                >
                  Delete
                </button>
              </div>
            )}
          </For>
        </div>
      </Show>
      <Show when={(tagsQuery.data?.tags.length ?? 0) === 0}>
        <div
          class={css({
            border: "1px dashed",
            borderColor: "gray.200",
            rounded: "md",
            p: "4",
            textAlign: "center",
            color: "gray.500",
          })}
        >
          No tags yet. Create one to get started.
        </div>
      </Show>
    </div>
  );
};

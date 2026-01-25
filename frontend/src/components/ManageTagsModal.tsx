import { For, Show, createSignal } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { useTags } from "../lib/tag-query";
import { useManageFeedTags } from "../lib/feed-query";

interface ManageTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedIds: string[];
}

export function ManageTagsModal(props: ManageTagsModalProps) {
  const tagsQuery = useTags();
  const manageTagsMutation = useManageFeedTags();

  const [addTagIds, setAddTagIds] = createSignal<string[]>([]);
  const [removeTagIds, setRemoveTagIds] = createSignal<string[]>([]);

  const toggleAddTag = (id: string) => {
    if (addTagIds().includes(id)) {
      setAddTagIds(addTagIds().filter((t) => t !== id));
    } else {
      setAddTagIds([...addTagIds(), id]);
      // Remove from 'remove' list if it's there
      setRemoveTagIds(removeTagIds().filter((t) => t !== id));
    }
  };

  const toggleRemoveTag = (id: string) => {
    if (removeTagIds().includes(id)) {
      setRemoveTagIds(removeTagIds().filter((t) => t !== id));
    } else {
      setRemoveTagIds([...removeTagIds(), id]);
      // Remove from 'add' list if it's there
      setAddTagIds(addTagIds().filter((t) => t !== id));
    }
  };

  const handleSave = async () => {
    try {
      await manageTagsMutation.mutateAsync({
        feedIds: props.feedIds,
        addTagIds: addTagIds(),
        removeTagIds: removeTagIds(),
      });
      props.onClose();
      // Reset state
      setAddTagIds([]);
      setRemoveTagIds([]);
    } catch (e) {
      console.error("Failed to manage tags", e);
    }
  };

  return (
    <Show when={props.isOpen}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Backdrop click handling */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Backdrop click handling */}
      <div
        class={css({
          position: "fixed",
          top: 0,
          left: 0,
          width: "full",
          height: "full",
          bg: "black/50",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        })}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            props.onClose();
          }
        }}
      >
        <div
          class={stack({
            bg: "white",
            padding: "6",
            rounded: "lg",
            width: "xl",
            maxWidth: "90%",
            gap: "6",
          })}
        >
          <div class={stack({ gap: "1" })}>
            <h2 class={css({ fontSize: "xl", fontWeight: "bold" })}>
              Manage Tags for {props.feedIds.length} feeds
            </h2>
            <p class={css({ fontSize: "sm", color: "gray.500" })}>
              Select tags to add to or remove from all selected feeds.
            </p>
          </div>

          <div class={stack({ gap: "4" })}>
            <div class={stack({ gap: "2" })}>
              <h3 class={css({ fontSize: "md", fontWeight: "semibold" })}>
                All Tags
              </h3>
              <div
                class={css({
                  maxHeight: "60",
                  overflowY: "auto",
                  border: "1px solid",
                  borderColor: "gray.200",
                  rounded: "md",
                })}
              >
                <For each={tagsQuery.data?.tags}>
                  {(tag) => (
                    <div
                      class={flex({
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "2",
                        borderBottom: "1px solid",
                        borderColor: "gray.100",
                        _last: { borderBottom: "none" },
                      })}
                    >
                      <span class={css({ fontSize: "sm" })}>{tag.name}</span>
                      <div class={flex({ gap: "2" })}>
                        <button
                          type="button"
                          onClick={() => toggleAddTag(tag.id)}
                          class={css({
                            px: "2",
                            py: "1",
                            rounded: "md",
                            fontSize: "xs",
                            cursor: "pointer",
                            border: "1px solid",
                            ...(addTagIds().includes(tag.id)
                              ? {
                                  bg: "green.100",
                                  borderColor: "green.500",
                                  color: "green.700",
                                }
                              : {
                                  bg: "gray.50",
                                  borderColor: "gray.300",
                                  color: "gray.600",
                                }),
                          })}
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleRemoveTag(tag.id)}
                          class={css({
                            px: "2",
                            py: "1",
                            rounded: "md",
                            fontSize: "xs",
                            cursor: "pointer",
                            border: "1px solid",
                            ...(removeTagIds().includes(tag.id)
                              ? {
                                  bg: "red.100",
                                  borderColor: "red.500",
                                  color: "red.700",
                                }
                              : {
                                  bg: "gray.50",
                                  borderColor: "gray.300",
                                  color: "gray.600",
                                }),
                          })}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>

          <div class={flex({ justifyContent: "flex-end", gap: "3" })}>
            <button
              type="button"
              onClick={props.onClose}
              class={css({
                px: "4",
                py: "2",
                rounded: "md",
                fontSize: "sm",
                cursor: "pointer",
                bg: "gray.100",
                hover: { bg: "gray.200" },
              })}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={
                manageTagsMutation.isPending ||
                (addTagIds().length === 0 && removeTagIds().length === 0)
              }
              class={css({
                px: "4",
                py: "2",
                rounded: "md",
                fontSize: "sm",
                cursor: "pointer",
                bg: "blue.600",
                color: "white",
                hover: { bg: "blue.700" },
                _disabled: { opacity: 0.5, cursor: "not-allowed" },
              })}
            >
              {manageTagsMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}

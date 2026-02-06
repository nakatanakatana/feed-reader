import { useMutation } from "@tanstack/solid-query";
import { createSignal, For } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { manageFeedTags } from "../lib/db";
import { useTags } from "../lib/tag-query";
import { ActionButton } from "./ui/ActionButton";
import { Modal } from "./ui/Modal";

interface ManageTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedIds: string[];
}

export function ManageTagsModal(props: ManageTagsModalProps) {
  const tagsQuery = useTags();
  const manageTagsMutation = useMutation(() => ({
    mutationFn: manageFeedTags,
  }));

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
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      size="standard"
      title={`Manage Tags for ${props.feedIds.length} feeds`}
      ariaLabel="Manage tags"
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
              manageTagsMutation.isPending ||
              (addTagIds().length === 0 && removeTagIds().length === 0)
            }
          >
            {manageTagsMutation.isPending ? "Saving..." : "Save Changes"}
          </ActionButton>
        </div>
      }
    >
      <div class={stack({ gap: "4" })}>
        <p class={css({ fontSize: "sm", color: "gray.500" })}>
          Select tags to add to or remove from all selected feeds.
        </p>
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
                    <ActionButton
                      size="sm"
                      variant={
                        addTagIds().includes(tag.id) ? "primary" : "secondary"
                      }
                      onClick={() => toggleAddTag(tag.id)}
                    >
                      Add
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant={
                        removeTagIds().includes(tag.id) ? "danger" : "secondary"
                      }
                      onClick={() => toggleRemoveTag(tag.id)}
                    >
                      Remove
                    </ActionButton>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </Modal>
  );
}

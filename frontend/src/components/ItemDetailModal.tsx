import { For, type JSX, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { useItem, useUpdateItemStatus } from "../lib/item-query";
import {
  formatDate,
  getItemDisplayDate,
  normalizeCategories,
} from "../lib/item-utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ActionButton } from "./ui/ActionButton";
import { Modal } from "./ui/Modal";

interface ItemDetailModalProps {
  itemId: string | undefined;
  onClose: () => void;
  prevItemId?: string;
  nextItemId?: string;
  onPrev?: () => void;
  onNext?: () => void;
  footerExtras?: JSX.Element;
}

export function ItemDetailModal(props: ItemDetailModalProps) {
  const itemQuery = useItem(() => props.itemId);
  const updateStatusMutation = useUpdateItemStatus();

  const handleToggleRead = () => {
    const item = itemQuery.data;
    if (!item) return;

    updateStatusMutation.mutate({
      ids: [item.id],
      isRead: !item.isRead,
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      props.onClose();
    } else if (e.key === "ArrowLeft" || e.key === "j" || e.key === "J") {
      if (props.onPrev && props.prevItemId) props.onPrev();
    } else if (e.key === "ArrowRight" || e.key === "k" || e.key === "K") {
      if (props.onNext && props.nextItemId) props.onNext();
    }
  };

  const footer = props.footerExtras ?? (
    <>
      <div class={flex({ gap: "2" })}>
        <ActionButton
          variant="secondary"
          onClick={props.onPrev}
          disabled={!props.prevItemId}
        >
          ← Previous
        </ActionButton>
        <ActionButton
          variant="secondary"
          onClick={props.onNext}
          disabled={!props.nextItemId}
        >
          Next →
        </ActionButton>
      </div>
      <ActionButton
        variant={itemQuery.data?.isRead ? "secondary" : "ghost"}
        onClick={handleToggleRead}
        disabled={updateStatusMutation.isPending}
      >
        {itemQuery.data?.isRead ? "Mark as Unread" : "Mark as Read"}
      </ActionButton>
    </>
  );

  return (
    <Show when={props.itemId}>
      <Modal
        isOpen={!!props.itemId}
        onClose={props.onClose}
        size="full"
        hideClose
        ariaLabel="Item details"
        onKeyDown={handleKeyDown}
        bodyPadding={false}
        footer={footer}
      >
        <div
          class={flex({
            justifyContent: "space-between",
            alignItems: "center",
            padding: "4",
            borderBottom: "1px solid",
            borderColor: "gray.100",
          })}
        >
          <h2
            class={css({
              fontSize: "lg",
              fontWeight: "bold",
              truncate: true,
              flex: 1,
            })}
          >
            <Show when={itemQuery.data} fallback="Loading...">
              {(item) => (
                <a
                  href={item().url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class={css({
                    color: "inherit",
                    textDecoration: "none",
                    _hover: {
                      textDecoration: "underline",
                      color: "blue.600",
                    },
                  })}
                >
                  {item().title}
                </a>
              )}
            </Show>
          </h2>
          <ActionButton variant="ghost" onClick={props.onClose}>
            Close
          </ActionButton>
        </div>
        <div
          class={flex({
            flexDirection: "column",
            gap: "4",
            padding: "6",
            overflowY: "auto",
            height: "full",
          })}
        >
          <Show when={itemQuery.isLoading}>
            <div
              class={css({
                textAlign: "center",
                padding: "10",
                color: "gray.500",
              })}
            >
              Loading content...
            </div>
          </Show>

          <Show when={itemQuery.data}>
            {(item) => (
              <>
                <div
                  class={flex({
                    gap: "4",
                    fontSize: "sm",
                    color: "gray.500",
                    flexWrap: "wrap",
                    alignItems: "center",
                  })}
                >
                  <span>
                    {getItemDisplayDate(item()).label}:{" "}
                    {formatDate(getItemDisplayDate(item()).date)}
                  </span>
                  <Show when={item().author}>
                    <span>By {item().author}</span>
                  </Show>
                  <Show when={item().categories}>
                    <div class={flex({ gap: "1", flexWrap: "wrap" })}>
                      <For each={normalizeCategories(item().categories)}>
                        {(cat) => (
                          <span
                            class={css({
                              px: "2",
                              py: "0.5",
                              bg: "gray.100",
                              rounded: "full",
                              fontSize: "10px",
                              color: "gray.600",
                              border: "1px solid",
                              borderColor: "gray.200",
                            })}
                          >
                            {cat}
                          </span>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>

                <Show when={item().imageUrl}>
                  <div class={css({ my: "4" })}>
                    <img
                      src={item().imageUrl}
                      alt=""
                      class={css({
                        maxWidth: "full",
                        height: "auto",
                        borderRadius: "md",
                        boxShadow: "sm",
                      })}
                    />
                  </div>
                </Show>

                <div
                  class={css({
                    lineHeight: "relaxed",
                    "& a": { color: "blue.600", textDecoration: "underline" },
                    "& p": { marginBottom: "4" },
                    "& img": { maxWidth: "full", height: "auto", my: "4" },
                  })}
                >
                  <MarkdownRenderer
                    content={item().content || item().description || ""}
                  />
                </div>
              </>
            )}
          </Show>
        </div>
      </Modal>
    </Show>
  );
}

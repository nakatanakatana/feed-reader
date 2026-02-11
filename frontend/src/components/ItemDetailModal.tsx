import { useQuery } from "@tanstack/solid-query";
import { createEffect, For, type JSX, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { getItem, items } from "../lib/item-db";
import { formatDate, normalizeCategories } from "../lib/item-utils";
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
  let modalRef: HTMLDivElement | undefined;

  createEffect(() => {
    // Track itemId and item data to trigger re-focus when content changes
    const id = props.itemId;
    const itemData = item();
    const loading = isLoading();

    if (id && !loading && itemData && modalRef) {
      requestAnimationFrame(() => {
        if (modalRef) {
          modalRef.focus();
        }
      });
    }
  });

  const itemQuery = useQuery(() => ({
    queryKey: ["item", props.itemId],
    queryFn: async () => {
      if (!props.itemId) return null;
      return await getItem(props.itemId);
    },
    enabled: !!props.itemId,
  }));

  const item = () => itemQuery.data ?? null;
  const isLoading = () => itemQuery.isPending;

  const handleToggleRead = () => {
    const currentItem = item();
    if (!currentItem) return;

    items().update(currentItem.id, (draft) => {
      draft.isRead = !currentItem.isRead;
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      props.onClose();
    } else if (
      e.key === "ArrowLeft" ||
      e.key === "k" ||
      e.key === "K" ||
      e.key === "h" ||
      e.key === "H"
    ) {
      if (props.onPrev && props.prevItemId) props.onPrev();
    } else if (
      e.key === "ArrowRight" ||
      e.key === "j" ||
      e.key === "J" ||
      e.key === "l" ||
      e.key === "L"
    ) {
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
        variant={item()?.isRead ? "secondary" : "ghost"}
        onClick={handleToggleRead}
      >
        {item()?.isRead ? "Mark as Unread" : "Mark as Read"}
      </ActionButton>
    </>
  );

  return (
    <Show when={props.itemId}>
      <Modal
        ref={(el) => {
          modalRef = el;
        }}
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
            <Show when={item()} fallback="Loading...">
              {(itemData) => (
                <a
                  href={itemData().url}
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
                  {itemData().title}
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
          <Show when={isLoading()}>
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

          <Show when={item()}>
            {(itemData) => {
              const isImageInContent = () => {
                const content =
                  itemData().content || itemData().description || "";
                return (
                  itemData().imageUrl && content.includes(itemData().imageUrl)
                );
              };

              return (
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
                    <Show when={!!itemData().publishedAt}>
                      <span>
                        Published: {formatDate(itemData().publishedAt)}
                      </span>
                    </Show>
                    <span>Received: {formatDate(itemData().createdAt)}</span>
                    <Show when={itemData().author}>
                      <span>By {itemData().author}</span>
                    </Show>
                    <Show when={itemData().categories}>
                      <div class={flex({ gap: "1", flexWrap: "wrap" })}>
                        <For
                          each={normalizeCategories(
                            itemData().categories ?? "",
                          )}
                        >
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

                  <Show when={itemData().imageUrl && !isImageInContent()}>
                    <div class={css({ my: "4" })}>
                      <img
                        src={itemData().imageUrl}
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
                      content={
                        itemData().content || itemData().description || ""
                      }
                    />
                  </div>
                </>
              );
            }}
          </Show>
        </div>
      </Modal>
    </Show>
  );
}

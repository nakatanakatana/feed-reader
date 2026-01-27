import { type JSX, onMount, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { center, flex, stack } from "../../styled-system/patterns";
import { useItem, useUpdateItemStatus } from "../lib/item-query";

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
  const itemQuery = useItem(() => props.itemId);
  const updateStatusMutation = useUpdateItemStatus();

  onMount(() => {
    if (modalRef) {
      modalRef.focus();
    }
  });

  const handleToggleRead = () => {
    const item = itemQuery.data;
    if (!item) return;

    updateStatusMutation.mutate({
      ids: [item.id],
      isRead: !item.isRead,
    });
  };

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
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

  return (
    <Show when={props.itemId}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Backdrop click to close */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Backdrop click to close */}
      <div
        onClick={handleBackdropClick}
        class={center({
          position: "fixed",
          top: 0,
          left: 0,
          width: "screen",
          height: "screen",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 1000,
          padding: { base: "0", md: "4" },
        })}
      >
        <div
          ref={modalRef}
          tabindex="-1"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          class={stack({
            backgroundColor: "white",
            width: { base: "full", md: "90%" },
            height: { base: "full", md: "90%" },
            maxWidth: { base: "full", md: "none" },
            maxHeight: { base: "full", md: "90vh" },
            borderRadius: { base: "none", md: "lg" },
            boxShadow: "xl",
            outline: "none",
            overflow: "hidden",
            position: "relative",
            textAlign: "left",
          })}
        >
          {/* Header */}
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
              {itemQuery.data?.title || "Loading..."}
            </h2>
          </div>

          {/* Content */}
          <div
            class={stack({
              padding: "6",
              overflowY: "auto",
              flex: 1,
              gap: "4",
            })}
          >
            <Show when={itemQuery.isLoading}>
              <div class={center({ padding: "10", color: "gray.500" })}>
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
                    })}
                  >
                    <span>{item().publishedAt}</span>
                    <Show when={item().author}>
                      <span>By {item().author}</span>
                    </Show>
                  </div>

                  <div
                    class={css({
                      lineHeight: "relaxed",
                      "& a": { color: "blue.600", textDecoration: "underline" },
                      "& p": { marginBottom: "4" },
                    })}
                    innerHTML={item().description}
                  />

                  <div class={flex({ gap: "4", marginTop: "4" })}>
                    <a
                      href={item().url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class={css({
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "2",
                        paddingInline: "4",
                        backgroundColor: "blue.600",
                        color: "white",
                        borderRadius: "md",
                        fontWeight: "medium",
                        textDecoration: "none",
                        _hover: { backgroundColor: "blue.700" },
                      })}
                    >
                      Open original article ↗
                    </a>
                  </div>
                </>
              )}
            </Show>
          </div>

          {/* Footer */}
          <div
            class={flex({
              justifyContent: "space-between",
              alignItems: "center",
              padding: "4",
              borderTop: "1px solid",
              borderColor: "gray.100",
              backgroundColor: "gray.50",
            })}
          >
            <Show
              when={props.footerExtras}
              fallback={
                <>
                  <div class={flex({ gap: "2" })}>
                    <button
                      type="button"
                      onClick={props.onPrev}
                      disabled={!props.prevItemId}
                      class={css({
                        padding: "2",
                        paddingInline: "4",
                        borderRadius: "md",
                        border: "1px solid",
                        borderColor: "gray.300",
                        backgroundColor: "white",
                        cursor: "pointer",
                        fontSize: "sm",
                        _hover: { backgroundColor: "gray.100" },
                        _disabled: { opacity: 0.5, cursor: "not-allowed" },
                      })}
                    >
                      ← Previous
                    </button>
                    <button
                      type="button"
                      onClick={props.onNext}
                      disabled={!props.nextItemId}
                      class={css({
                        padding: "2",
                        paddingInline: "4",
                        borderRadius: "md",
                        border: "1px solid",
                        borderColor: "gray.300",
                        backgroundColor: "white",
                        cursor: "pointer",
                        fontSize: "sm",
                        _hover: { backgroundColor: "gray.100" },
                        _disabled: { opacity: 0.5, cursor: "not-allowed" },
                      })}
                    >
                      Next →
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleRead}
                    disabled={updateStatusMutation.isPending}
                    class={css({
                      padding: "2",
                      paddingInline: "4",
                      borderRadius: "md",
                      backgroundColor: itemQuery.data?.isRead
                        ? "gray.200"
                        : "blue.50",
                      color: itemQuery.data?.isRead ? "gray.700" : "blue.700",
                      cursor: "pointer",
                      fontSize: "sm",
                      fontWeight: "medium",
                      _hover: { opacity: 0.8 },
                      _disabled: { opacity: 0.5, cursor: "not-allowed" },
                    })}
                  >
                    {itemQuery.data?.isRead ? "Mark as Unread" : "Mark as Read"}
                  </button>
                </>
              }
            >
              {props.footerExtras}
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}

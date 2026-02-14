import { useQuery } from "@tanstack/solid-query";
import { createEffect, For, type JSX, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { getItem, items } from "../lib/item-db";
import { formatDate, normalizeCategories } from "../lib/item-utils";
import { useSwipe } from "../lib/use-swipe";
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

  const { x, isSwiping, handlers } = useSwipe({
    onSwipeLeft: () => {
      if (props.onNext && props.nextItemId && props.itemId !== "end-of-list") {
        props.onNext();
      }
    },
    onSwipeRight: () => {
      if (props.onPrev && props.prevItemId) {
        props.onPrev();
      }
    },
    threshold: 100, // Use a higher threshold than the hook default (50px) to reduce accidental swipes
    disabled: props.itemId === "end-of-list",
  });

  // Determine if we can navigate
  const canSwipeLeft = () =>
    !!(props.onNext && props.nextItemId && props.itemId !== "end-of-list");
  const canSwipeRight = () => !!(props.onPrev && props.prevItemId);

  // Apply a "bounce" effect at boundaries (resist dragging)
  const displayX = () => {
    const rawX = x();
    if (rawX > 0 && !canSwipeRight()) return rawX ** 0.7;
    if (rawX < 0 && !canSwipeLeft()) return -(Math.abs(rawX) ** 0.7);
    return rawX;
  };

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
      if (!props.itemId || props.itemId === "end-of-list") return null;
      return await getItem(props.itemId);
    },
    enabled: !!props.itemId && props.itemId !== "end-of-list",
  }));

  const item = () => itemQuery.data ?? null;
  const isLoading = () => itemQuery.isPending;
  const isEndOfList = () => props.itemId === "end-of-list";

  const handleToggleRead = () => {
    const currentItem = item();
    if (!currentItem || isEndOfList()) return;

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
      const prevId = props.prevItemId;
      if (props.onPrev && prevId) props.onPrev();
    } else if (
      e.key === "ArrowRight" ||
      e.key === "j" ||
      e.key === "J" ||
      e.key === "l" ||
      e.key === "L"
    ) {
      const nextId = props.nextItemId;
      if (!isEndOfList() && props.onNext && nextId) props.onNext();
    }
  };

  const footer = props.footerExtras ?? (
    <>
      <Show when={!isEndOfList()}>
        <ActionButton
          variant={item()?.isRead ? "secondary" : "ghost"}
          onClick={handleToggleRead}
        >
          {item()?.isRead ? "Mark as Unread" : "Mark as Read"}
        </ActionButton>
      </Show>
      <Show when={isEndOfList()}>
        <ActionButton variant="primary" onClick={props.onClose}>
          Back to List
        </ActionButton>
      </Show>
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
        ariaLabel={isEndOfList() ? "End of list reached" : "Item details"}
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
            <Show when={isEndOfList()}>
              <span>End of List</span>
            </Show>
            <Show when={!isEndOfList()}>
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
            </Show>
          </h2>
          <ActionButton variant="ghost" onClick={props.onClose}>
            Close
          </ActionButton>
        </div>

        {/* Accessibility instruction for screen readers */}
        <div
          id="swipe-instruction"
          class={css({
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: "0",
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            borderWidth: "0",
          })}
        >
          <Show
            when={canSwipeLeft() || canSwipeRight()}
            fallback="Swipe navigation not available."
          >
            Swipe left for next item, right for previous.
          </Show>
        </div>

        <div
          data-testid="swipe-container"
          aria-describedby="swipe-instruction"
          class={flex({
            flexDirection: "column",
            gap: "4",
            padding: "6",
            overflowY: "auto",
            height: "full",
          })}
          style={{
            transform: `translateX(${displayX()}px)`,
            transition: isSwiping() ? "none" : "transform 0.2s ease-out",
            "will-change": canSwipeLeft() || canSwipeRight() ? "transform" : undefined,
          }}
          {...handlers}
        >
          <Show when={isEndOfList()}>
            <div
              class={flex({
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "full",
                gap: "6",
                textAlign: "center",
              })}
            >
              <div
                class={css({
                  fontSize: "4xl",
                  color: "gray.300",
                })}
                aria-hidden="true"
              >
                🎉
              </div>
              <div>
                <h3
                  class={css({
                    fontSize: "xl",
                    fontWeight: "bold",
                    color: "gray.700",
                    mb: "2",
                  })}
                >
                  You've reached the end of the list!
                </h3>
                <p class={css({ color: "gray.500" })}>
                  You've caught up with all the items in this view.
                </p>
              </div>
            </div>
          </Show>

          <Show when={isLoading() && !isEndOfList()}>
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

          <Show when={!isEndOfList() && item()}>
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
                      "& pre": {
                        overflowX: "auto",
                        maxWidth: "full",
                        backgroundColor: "gray.50",
                        padding: "4",
                        borderRadius: "md",
                        border: "1px solid",
                        borderColor: "gray.200",
                        my: "4",
                      },
                      "& code": {
                        fontFamily: "mono",
                        fontSize: "0.9em",
                        backgroundColor: "gray.100",
                        padding: "0.2em 0.4em",
                        borderRadius: "sm",
                      },
                      "& pre code": {
                        backgroundColor: "transparent",
                        padding: 0,
                        borderRadius: 0,
                        fontSize: "sm",
                      },
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

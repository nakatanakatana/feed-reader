import { eq, useLiveQuery } from "@tanstack/solid-db";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { createEffect, For, type JSX, onCleanup, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import {
  getItem,
  type Item,
  items,
  updateItemReadStatus,
} from "../lib/item-db";
import { ITEM_STALE_TIME } from "../lib/item-query-constants";
import {
  extractHostname,
  formatDate,
  normalizeCategories,
} from "../lib/item-utils";
import { useSwipe } from "../lib/use-swipe";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ActionButton } from "./ui/ActionButton";
import { GlobeIcon, PublishedIcon, ReceivedIcon } from "./ui/Icons";
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
  const queryClient = useQueryClient();

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
      const currentModalRef = modalRef;
      const cleanupTasks: (() => void)[] = [];

      requestAnimationFrame(() => {
        if (currentModalRef) {
          currentModalRef.focus();
        }

        // Detect image layout and set data-layout attribute
        const imgs = currentModalRef.querySelectorAll("img");
        for (const img of imgs) {
          const updateLayout = () => {
            const naturalHeight = img.naturalHeight;
            let layout = "other";
            // Avoid division by zero or invalid ratios for malformed/edge-case images
            if (!naturalHeight) {
              img.setAttribute("data-layout", layout);
              return;
            }
            const ratio = img.naturalWidth / naturalHeight;
            if (ratio > 1.1) {
              layout = "hero";
            } else if (ratio >= 0.9 && ratio <= 1.1) {
              layout = "icon";
            }
            img.setAttribute("data-layout", layout);
          };

          if (img.complete) {
            updateLayout();
          } else {
            img.addEventListener("load", updateLayout, { once: true });
            cleanupTasks.push(() =>
              img.removeEventListener("load", updateLayout),
            );
          }
        }
      });

      onCleanup(() => {
        for (const task of cleanupTasks) task();
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
    staleTime: ITEM_STALE_TIME,
  }));

  const item = () => itemQuery.data ?? null;
  const isLoading = () => itemQuery.isPending;
  const isEndOfList = () => props.itemId === "end-of-list";

  // Prioritize looking up the target item within the items collection
  const collectionItems = useLiveQuery((q) => {
    const id = props.itemId;
    if (!id || id === "end-of-list") {
      // Return a non-matching query to initialize the signal correctly
      return q
        .from({ item: items() })
        .where(({ item }) => eq(item.id, "__none__"))
        .select(({ item }) => ({ ...item }));
    }
    return q
      .from({ item: items() })
      .where(({ item }) => eq(item.id, id))
      .select(({ item }) => ({ ...item }));
  });

  const collectionItem = () => collectionItems()[0];

  const prioritizedItem = () => collectionItem() || item();

  const handleToggleRead = async () => {
    const currentItem = prioritizedItem();
    if (!currentItem || isEndOfList()) return;

    const newIsRead = !currentItem.isRead;
    const inCollection = collectionItem();

    // Always update the individual item query cache for immediate UI feedback in the modal.
    // This handles both the collection and fallback cases.
    queryClient.setQueryData(
      ["item", props.itemId],
      (old: Item | null | undefined) => {
        if (!old) return old;
        return { ...old, isRead: newIsRead };
      },
    );

    try {
      // Use items().update if the item is in the collection to keep the list in sync
      if (inCollection) {
        items().update(currentItem.id, (draft) => {
          draft.isRead = newIsRead;
        });
      } else {
        // Call the API directly only if NOT in collection (items().update handles it otherwise)
        await updateItemReadStatus([currentItem.id], newIsRead);
      }
    } catch (e) {
      console.error("Failed to update item status", e);
      // Rollback cache on error
      queryClient.setQueryData(
        ["item", props.itemId],
        (old: Item | null | undefined) => {
          if (!old) return old;
          return { ...old, isRead: currentItem.isRead };
        },
      );
    }
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

  const footer = () => {
    if (props.footerExtras) return props.footerExtras;
    if (isEndOfList()) {
      return (
        <ActionButton variant="primary" onClick={props.onClose}>
          Back to List
        </ActionButton>
      );
    }
    return undefined;
  };

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
        footer={footer()}
      >
        <div
          class={flex({
            justifyContent: "space-between",
            alignItems: "center",
            padding: "2",
            borderBottom: "1px solid",
            borderColor: "gray.100",
          })}
        >
          <h2
            class={css({
              fontSize: "md",
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

        <Show when={!isEndOfList() && item()}>
          <div
            class={css({
              position: "absolute",
              bottom: { base: "6", md: "8" },
              right: { base: "6", md: "8" },
              zIndex: 10,
            })}
          >
            <button
              type="button"
              onClick={handleToggleRead}
              title={
                prioritizedItem()?.isRead ? "Mark as Unread" : "Mark as Read"
              }
              aria-label={
                prioritizedItem()?.isRead ? "Mark as Unread" : "Mark as Read"
              }
              aria-pressed={prioritizedItem()?.isRead ?? false}
              class={css({
                width: "14",
                height: "14",
                borderRadius: "full",
                bg: prioritizedItem()?.isRead ? "white" : "blue.600",
                color: prioritizedItem()?.isRead ? "blue.600" : "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "lg",
                cursor: "pointer",
                border: "1px solid",
                borderColor: prioritizedItem()?.isRead
                  ? "blue.600"
                  : "transparent",
                transition: "all 0.2s",
                _hover: {
                  transform: "scale(1.05)",
                  bg: prioritizedItem()?.isRead ? "blue.50" : "blue.700",
                },
                _active: {
                  transform: "scale(0.95)",
                },
              })}
            >
              <Show
                when={prioritizedItem()?.isRead}
                fallback={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </Show>
            </button>
          </div>
        </Show>

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
            paddingTop: "0",
            pb: "24",
            overflowY: "auto",
            height: "full",
          })}
          style={{
            transform: `translateX(${displayX()}px)`,
            transition: isSwiping() ? "none" : "transform 0.2s ease-out",
            "will-change":
              canSwipeLeft() || canSwipeRight() ? "transform" : undefined,
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
                const data = itemData();
                const imageUrl = data.imageUrl;
                if (!imageUrl) return false;
                const content = data.content || data.description || "";
                return content.includes(imageUrl);
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
                    <Show when={itemData().url}>
                      <span
                        class={flex({ gap: "1", alignItems: "center" })}
                        title="Source Domain"
                      >
                        <GlobeIcon />
                        <span>
                          {extractHostname(itemData().url || "")}
                        </span>
                      </span>
                    </Show>
                    <Show when={!!itemData().publishedAt}>
                      <span
                        class={flex({ gap: "1", alignItems: "center" })}
                        title="Published Date"
                      >
                        <span
                          class={css({
                            display: { base: "none", xs: "inline" },
                          })}
                        >
                          Published:
                        </span>
                        <span
                          class={css({
                            display: { base: "inline", xs: "none" },
                          })}
                          title="Published"
                        >
                          <PublishedIcon />
                          <span
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
                            Published:
                          </span>
                        </span>
                        {formatDate(itemData().publishedAt)}
                      </span>
                    </Show>
                    <span
                      class={flex({ gap: "1", alignItems: "center" })}
                      title="Received Date"
                    >
                      <span
                        class={css({ display: { base: "none", xs: "inline" } })}
                      >
                        Received:
                      </span>
                      <span
                        class={css({ display: { base: "inline", xs: "none" } })}
                        title="Received"
                      >
                        <ReceivedIcon />
                        <span
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
                          Received:
                        </span>
                      </span>
                      {formatDate(itemData().createdAt)}
                    </span>
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
                          opacity: 0,
                          transition: "opacity 0.2s",
                          maxHeight: "10vh",
                          "&[data-layout]": { opacity: 1 },
                          "&[data-layout='hero']": { maxHeight: "30vh" },
                          "&[data-layout='icon']": { maxHeight: "5vh" },
                          "&[data-layout='other']": { maxHeight: "10vh" },
                        })}
                      />
                    </div>
                  </Show>

                  <div
                    class={css({
                      lineHeight: "relaxed",
                      "& a": {
                        color: "blue.600",
                        textDecoration: "underline",
                        "&:has(img)": {
                          display: "inline-block",
                          maxWidth: "full",
                          verticalAlign: "bottom",
                        },
                      },
                      "& p": {
                        marginBottom: "4",
                      },
                      "& p:has(img + img), & p:has(a + a), & p:has(img + a), & p:has(a + img)":
                        {
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "2",
                          alignItems: "center",
                        },
                      "& img": {
                        maxWidth: "full",
                        height: "auto",
                        my: "4",
                        opacity: 0,
                        transition: "opacity 0.2s",
                        maxHeight: "10vh",
                        "&[data-layout]": { opacity: 1 },
                        "&[data-layout='hero']": { maxHeight: "30vh" },
                        "&[data-layout='icon']": { maxHeight: "5vh" },
                        "&[data-layout='other']": { maxHeight: "10vh" },
                      },
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
                      // Target images inside links with color mode markers
                      // Support both raw (#gh-*) and URL-encoded (%23gh-*) variants
                      '& a:is([href*="#gh-light-mode-only"], [href*="%23gh-light-mode-only"]) img':
                        {
                          display: "inline-block",
                        },
                      '& a:is([href*="#gh-dark-mode-only"], [href*="%23gh-dark-mode-only"]) img':
                        {
                          display: "none",
                        },
                      "@media (prefers-color-scheme: dark)": {
                        '& a:is([href*="#gh-light-mode-only"], [href*="%23gh-light-mode-only"]) img':
                          {
                            display: "none !important",
                          },
                        '& a:is([href*="#gh-dark-mode-only"], [href*="%23gh-dark-mode-only"]) img':
                          {
                            display: "inline-block !important",
                          },
                      },
                      "@media (prefers-color-scheme: light)": {
                        '& a:is([href*="#gh-light-mode-only"], [href*="%23gh-light-mode-only"]) img':
                          {
                            display: "inline-block !important",
                          },
                        '& a:is([href*="#gh-dark-mode-only"], [href*="%23gh-dark-mode-only"]) img':
                          {
                            display: "none !important",
                          },
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

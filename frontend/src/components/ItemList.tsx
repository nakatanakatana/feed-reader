import { count, eq, useLiveQuery } from "@tanstack/solid-db";
import { useLocation, useNavigate } from "@tanstack/solid-router";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { feedTag, type Item, items, itemsUnreadQuery, tags } from "../lib/db";
import { itemStore } from "../lib/item-store";
import { type DateFilterValue, formatUnreadCount } from "../lib/item-utils";
import { BulkActionBar } from "./BulkActionBar";
import { DateFilterSelector } from "./DateFilterSelector";
import { ItemRow } from "./ItemRow";
import { ActionButton } from "./ui/ActionButton";
import { Badge } from "./ui/Badge";
import { EmptyState } from "./ui/EmptyState";
import { HorizontalScrollList } from "./ui/HorizontalScrollList";
import { TagChip } from "./ui/TagChip";

interface ItemListProps {
  tagId?: string;
  dateFilter?: DateFilterValue;
  fixedControls?: boolean;
  headerActions?: JSX.Element;
}

export function ItemList(props: ItemListProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedItemIds, setSelectedItemIds] = createSignal<Set<string>>(
    new Set(),
  );
  const [isBulkMarking, setIsBulkMarking] = createSignal(false);
  const [showMoreActions, setShowMoreActions] = createSignal(false);
  let moreActionsRef: HTMLDivElement | undefined;

  onMount(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreActionsRef && !moreActionsRef.contains(e.target as Node)) {
        setShowMoreActions(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    onCleanup(() => document.removeEventListener("click", handleClickOutside));
  });

  createEffect(() => {
    if (props.dateFilter) {
      itemStore.setDateFilter(props.dateFilter);
    }
  });

  const itemQuery = useLiveQuery((q) => {
    let query = q
      .from({ item: items() })
      .orderBy(({ item }) => item.publishedAt, {
        direction: "asc",
        nulls: "last",
      })
      .orderBy(({ item }) => item.createdAt, "asc");
    if (props.tagId) {
      query = query
        .innerJoin(
          { ft: feedTag },
          // biome-ignore lint/suspicious/noExplicitAny: TanStack DB join types
          ({ item, ft }: any) => eq(item.feedId, ft.feedId),
        )
        // biome-ignore lint/suspicious/noExplicitAny: TanStack DB where types
        .where(({ ft }: any) => eq(ft.tagId, props.tagId));
    }
    // biome-ignore lint/suspicious/noExplicitAny: TanStack DB select types
    return query.select(({ item }: any) => ({ ...item }));
  });

  const filteredItems = createMemo(() => {
    return itemQuery().filter(
      (item) => !itemStore.state.transientRemovedIds[item.id],
    );
  });

  const handleClearReadItems = () => {
    const readItemIds = filteredItems()
      .filter((item) => item.isRead)
      .map((item) => item.id);
    itemStore.addTransientRemovedIds(readItemIds);
  };

  const totalUnread = useLiveQuery((q) =>
    q
      .from({ i: itemsUnreadQuery() })
      .select(({ i }) => ({ total: count(i.id) })),
  );

  const tagsQuery = useLiveQuery((q) => {
    return q
      .from({ tag: tags })
      .leftJoin({ tf: feedTag }, ({ tag, tf }) => eq(tag.id, tf.tagId))
      .leftJoin({ i: itemsUnreadQuery() }, ({ tf, i }) =>
        eq(tf?.feedId, i.feedId),
      )
      .groupBy(({ tag }) => [tag.id, tag.name])
      .select(({ tag, i }) => ({
        id: tag.id,
        name: tag.name,
        unreadCount: count(i?.id),
      }));
  });

  const handleDateFilterSelect = (value: DateFilterValue) => {
    itemStore.setDateFilter(value);
    navigate({
      // @ts-expect-error
      search: (prev) => ({
        ...prev,
        since: value === "all" ? undefined : value,
      }),
    });
  };

  const isAllSelected = () =>
    filteredItems().length > 0 &&
    selectedItemIds().size === filteredItems().length;

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedItemIds(new Set<string>(filteredItems().map((i) => i.id)));
    } else {
      setSelectedItemIds(new Set<string>());
    }
  };

  const handleToggleItem = (itemId: string, selected: boolean) => {
    const next = new Set<string>(selectedItemIds());
    if (selected) {
      next.add(itemId);
    } else {
      next.delete(itemId);
    }
    setSelectedItemIds(next);
  };

  const handleItemClick = (itemId: string) => {
    const isItemDetailOpen = location().pathname.includes("/items/");
    navigate({
      to: "/items/$itemId",
      params: { itemId },
      search: {
        tagId: props.tagId,
        since: props.dateFilter,
      },
      replace: isItemDetailOpen,
    });
  };

  const handleTagClick = (tagId: string | undefined) => {
    navigate({
      to: ".",
      search: { tagId },
    });
  };

  const handleBulkMarkAsRead = async () => {
    const ids = Array.from(selectedItemIds());
    if (ids.length === 0) return;

    setIsBulkMarking(true);
    try {
      items().update(ids, (drafts) => {
        for (const draft of drafts) {
          draft.isRead = true;
        }
      });
    } finally {
      setIsBulkMarking(false);
    }

    setSelectedItemIds(new Set<string>());
  };

  const controls = (
    <div class={stack({ gap: "2", width: "full" })}>
      {/* Row 1: Tag Filters */}
      <div
        class={flex({
          gap: "2",
          alignItems: "center",
          width: "full",
          minWidth: 0,
        })}
      >
        <span
          class={css({
            fontSize: "sm",
            color: "gray.600",
            whiteSpace: "nowrap",
          })}
        >
          Filter by Tag:
        </span>
        <HorizontalScrollList>
          <TagChip
            selected={props.tagId === undefined}
            onClick={() => handleTagClick(undefined)}
          >
            All
            <Show when={(totalUnread()[0]?.total ?? 0n) > 0n}>
              <Badge
                variant={props.tagId === undefined ? "primary" : "neutral"}
                class={css({ ml: "1.5", fontSize: "10px", minWidth: "1.5rem" })}
              >
                {formatUnreadCount(Number(totalUnread()[0].total))}
              </Badge>
            </Show>
          </TagChip>
          <For each={tagsQuery()}>
            {(tag) => (
              <TagChip
                selected={props.tagId === tag.id}
                onClick={() => handleTagClick(tag.id)}
              >
                {tag.name}
                <Show when={(tag.unreadCount ?? 0n) > 0n}>
                  <Badge
                    variant={props.tagId === tag.id ? "primary" : "neutral"}
                    class={css({
                      ml: "1.5",
                      fontSize: "10px",
                      minWidth: "1.5rem",
                    })}
                  >
                    {formatUnreadCount(Number(tag.unreadCount))}
                  </Badge>
                </Show>
              </TagChip>
            )}
          </For>
        </HorizontalScrollList>
      </div>

      {/* Row 2: Actions and other filters */}
      <div
        class={flex({
          justifyContent: "space-between",
          alignItems: "center",
          gap: "2",
          flexWrap: "nowrap",
        })}
      >
        <div
          class={flex({
            gap: "2",
            alignItems: "center",
            flexShrink: 0,
            minW: 0,
          })}
        >
          {props.headerActions}
        </div>

        <div
          class={flex({
            gap: { base: "2", md: "4" },
            alignItems: "center",
            flexShrink: 0,
          })}
        >
          {/* Desktop Actions */}
          <div
            class={flex({
              display: { base: "none", md: "flex" },
              gap: "4",
              alignItems: "center",
            })}
          >
            <ActionButton
              size="sm"
              variant="secondary"
              onClick={handleClearReadItems}
              aria-label="Clear read items from current view"
            >
              Clear Read Items
            </ActionButton>
            <DateFilterSelector
              value={itemStore.state.since}
              onSelect={handleDateFilterSelect}
            />
            <div class={flex({ gap: "2", alignItems: "center" })}>
              <input
                id="show-read-toggle"
                type="checkbox"
                checked={itemStore.state.showRead}
                onChange={(e) => itemStore.setShowRead(e.currentTarget.checked)}
                class={css({ cursor: "pointer" })}
              />
              <label
                for="show-read-toggle"
                class={css({
                  fontSize: "sm",
                  color: "gray.600",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                })}
              >
                Show Read
              </label>
            </div>
            <div class={flex({ gap: "2", alignItems: "center" })}>
              <input
                id="select-all-checkbox"
                type="checkbox"
                checked={isAllSelected()}
                onChange={(e) => handleToggleAll(e.currentTarget.checked)}
                class={css({ cursor: "pointer" })}
              />
              <label
                for="select-all-checkbox"
                class={css({
                  fontSize: "sm",
                  color: "gray.600",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                })}
              >
                Select All
              </label>
            </div>
          </div>

          {/* Mobile Actions */}
          <div
            class={flex({
              display: { base: "flex", md: "none" },
              gap: "2",
              alignItems: "center",
            })}
          >
            <DateFilterSelector
              value={itemStore.state.since}
              onSelect={handleDateFilterSelect}
            />
            <div class={css({ position: "relative" })} ref={moreActionsRef}>
              <ActionButton
                size="sm"
                variant="secondary"
                onClick={() => setShowMoreActions(!showMoreActions())}
                aria-label="More actions"
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <title>More actions</title>
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                }
              >
                More
              </ActionButton>
              <Show when={showMoreActions()}>
                <div
                  class={css({
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    mt: "1",
                    bg: "white",
                    border: "1px solid",
                    borderColor: "gray.200",
                    borderRadius: "md",
                    boxShadow: "lg",
                    zIndex: 100,
                    minW: "160px",
                    display: "flex",
                    flexDirection: "column",
                    padding: "1",
                    gap: "1",
                  })}
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleClearReadItems();
                      setShowMoreActions(false);
                    }}
                    class={css({
                      display: "flex",
                      alignItems: "center",
                      px: "3",
                      py: "2",
                      fontSize: "sm",
                      color: "gray.700",
                      borderRadius: "sm",
                      textAlign: "left",
                      cursor: "pointer",
                      _hover: { bg: "gray.50" },
                    })}
                  >
                    Clear Read Items
                  </button>
                  <label
                    class={css({
                      display: "flex",
                      alignItems: "center",
                      gap: "2",
                      px: "3",
                      py: "2",
                      fontSize: "sm",
                      color: "gray.700",
                      borderRadius: "sm",
                      cursor: "pointer",
                      _hover: { bg: "gray.50" },
                    })}
                  >
                    <input
                      type="checkbox"
                      checked={itemStore.state.showRead}
                      onChange={(e) => {
                        itemStore.setShowRead(e.currentTarget.checked);
                      }}
                      class={css({ cursor: "pointer" })}
                    />
                    <span>Show Read</span>
                  </label>
                  <label
                    class={css({
                      display: "flex",
                      alignItems: "center",
                      gap: "2",
                      px: "3",
                      py: "2",
                      fontSize: "sm",
                      color: "gray.700",
                      borderRadius: "sm",
                      cursor: "pointer",
                      _hover: { bg: "gray.50" },
                    })}
                  >
                    <input
                      type="checkbox"
                      checked={isAllSelected()}
                      onChange={(e) => {
                        handleToggleAll(e.currentTarget.checked);
                      }}
                      class={css({ cursor: "pointer" })}
                    />
                    <span>Select All</span>
                  </label>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </div>

      <BulkActionBar
        selectedCount={selectedItemIds().size}
        onClear={() => setSelectedItemIds(new Set())}
      >
        <ActionButton
          size="sm"
          variant="primary"
          onClick={handleBulkMarkAsRead}
          disabled={isBulkMarking()}
        >
          {isBulkMarking() ? "Processing..." : "Mark as Read"}
        </ActionButton>
      </BulkActionBar>
    </div>
  );

  const listBody = (
    <div
      class={stack({
        gap: "4",
        padding: "0",
        paddingBottom: selectedItemIds().size > 0 ? "24" : "0",
      })}
    >
      <div class={stack({ gap: "2", padding: "0" })}>
        <For each={filteredItems() as Item[]}>
          {(item) => (
            <ItemRow
              item={item}
              onClick={() => handleItemClick(item.id)}
              selected={selectedItemIds().has(item.id)}
              onToggleSelection={(selected) =>
                handleToggleItem(item.id, selected)
              }
            />
          )}
        </For>
      </div>

      <Show when={itemQuery.isLoading}>
        <div
          class={css({ textAlign: "center", padding: "8", color: "gray.500" })}
        >
          Loading items...
        </div>
      </Show>

      <Show when={!itemQuery.isLoading && filteredItems().length === 0}>
        <EmptyState title="No items found." />
      </Show>
    </div>
  );

  return (
    <div
      class={stack({
        gap: "4",
        width: "full",
        position: "relative",
        minHeight: 0,
        flex: "1",
        height: "full",
      })}
    >
      {controls}
      <Show when={props.fixedControls} fallback={listBody}>
        <div
          class={css({
            flex: "1",
            minHeight: 0,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "white",
          })}
        >
          {listBody}
        </div>
      </Show>
    </div>
  );
}

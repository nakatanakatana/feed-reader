import { useNavigate } from "@tanstack/solid-router";
import { createEffect, createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { ListItemsRequest_SortOrder } from "../gen/item/v1/item_pb";
import { useItems, useUpdateItemStatus, getMergedItemsQuery } from "../lib/item-query";
import { useTags } from "../lib/tag-query";
import { DateFilterSelector } from "./DateFilterSelector";
import { ItemRow } from "./ItemRow";
import { getPublishedSince, type DateFilterValue, filterAndSortItems, SortOrder } from "../lib/item-utils";
import { useLiveQuery } from "@tanstack/solid-db";

interface ItemListProps {
  feedId?: string;
  tagId?: string;
  dateFilter?: DateFilterValue;
}

export function ItemList(props: ItemListProps) {
  const navigate = useNavigate();
  const updateStatusMutation = useUpdateItemStatus();
  const [selectedItemIds, setSelectedItemIds] = createSignal<Set<string>>(
    new Set(),
  );
  let listContainerRef: HTMLDivElement | undefined;

  const tagsQuery = useTags();
  const [showRead, setShowRead] = createSignal(false);
  const [dateFilter, setDateFilter] = createSignal<DateFilterValue>(
    props.dateFilter ?? "all",
  );

  const mergedItemsQuery = getMergedItemsQuery();
  const itemsLiveQuery = useLiveQuery(() => mergedItemsQuery);

  createEffect(() => {
    if (props.dateFilter) {
      setDateFilter(props.dateFilter);
    }
  });

  // Scroll position maintenance when prepending items
  let lastScrollHeight = 0;
  createEffect(() => {
    const items = allItems();
    if (listContainerRef && items.length > 0) {
      const currentScrollHeight = listContainerRef.scrollHeight;
      if (lastScrollHeight > 0 && currentScrollHeight > lastScrollHeight) {
        const diff = currentScrollHeight - lastScrollHeight;
        listContainerRef.scrollTop += diff;
      }
      lastScrollHeight = currentScrollHeight;
    }
  });

  const handleDateFilterSelect = (value: DateFilterValue) => {
    setDateFilter(value);
    navigate({
      search: (prev) => ({
        ...prev,
        publishedSince: value === "all" ? undefined : value,
      }),
    });
  };

  const itemsQuery = useItems(() => ({
    feedId: props.feedId,
    tagId: props.tagId,
    isRead: showRead() ? undefined : false,
    publishedSince: getPublishedSince(dateFilter()),
    sortOrder: ListItemsRequest_SortOrder.ASC,
  }));

  const allItems = () => {
    const rawItems = itemsLiveQuery() || [];
    return filterAndSortItems(rawItems as any, {
      feedId: props.feedId,
      isRead: showRead() ? undefined : false,
      sortOrder: SortOrder.ASC,
    });
  };

  const isLoading = () => itemsQuery.isLoading || itemsLiveQuery.isLoading;

  const isAllSelected = () =>
    allItems().length > 0 && selectedItemIds().size === allItems().length;

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedItemIds(new Set<string>(allItems().map((i) => i.id)));
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
    navigate({
      to: "/items/$itemId",
      params: { itemId },
      search: (prev) => ({ ...prev }),
    });
  };

  const handleTagClick = (tagId: string | undefined) => {
    navigate({
      to: ".",
      search: (prev) => ({ ...prev, tagId }),
    });
  };

  const handleBulkMarkAsRead = async () => {
    const ids = Array.from(selectedItemIds());
    if (ids.length === 0) return;

    await updateStatusMutation.mutateAsync({
      ids,
      isRead: true,
    });
    setSelectedItemIds(new Set<string>());
  };

  return (
    <div 
      ref={listContainerRef}
      class={stack({ gap: "4", width: "full", position: "relative" })}
    >
      <div
        class={flex({
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "4",
        })}
      >
        <div class={flex({ gap: "2", flexWrap: "wrap", alignItems: "center" })}>
          <span class={css({ fontSize: "sm", color: "gray.600" })}>
            Filter by Tag:
          </span>
          <button
            type="button"
            onClick={() => handleTagClick(undefined)}
            class={css({
              px: "3",
              py: "1",
              rounded: "full",
              fontSize: "xs",
              cursor: "pointer",
              border: "1px solid",
              transition: "all 0.2s",
              ...(props.tagId === undefined
                ? { bg: "blue.100", borderColor: "blue.500", color: "blue.700" }
                : {
                    bg: "gray.50",
                    borderColor: "gray.300",
                    color: "gray.600",
                  }),
            })}
          >
            All
          </button>
          <For each={tagsQuery.data?.tags}>
            {(tag) => (
              <button
                type="button"
                onClick={() => handleTagClick(tag.id)}
                class={css({
                  px: "3",
                  py: "1",
                  rounded: "full",
                  fontSize: "xs",
                  cursor: "pointer",
                  border: "1px solid",
                  transition: "all 0.2s",
                  ...(props.tagId === tag.id
                    ? {
                        bg: "blue.100",
                        borderColor: "blue.500",
                        color: "blue.700",
                      }
                    : {
                        bg: "gray.50",
                        borderColor: "gray.300",
                        color: "gray.600",
                      }),
                })}
              >
                {tag.name}
              </button>
            )}
          </For>
        </div>

        <div class={flex({ gap: "2", alignItems: "center" })}>
          <div
            class={flex({ gap: "2", alignItems: "center", marginRight: "4" })}
          >
            <DateFilterSelector
              value={dateFilter()}
              onSelect={handleDateFilterSelect}
            />
          </div>
          <div
            class={flex({ gap: "2", alignItems: "center", marginRight: "4" })}
          >
            <input
              id="show-read-toggle"
              type="checkbox"
              checked={showRead()}
              onChange={(e) => setShowRead(e.currentTarget.checked)}
              class={css({ cursor: "pointer" })}
            />
            <label
              for="show-read-toggle"
              class={css({
                fontSize: "sm",
                color: "gray.600",
                cursor: "pointer",
              })}
            >
              Show Read
            </label>
          </div>
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
            })}
          >
            Select All
          </label>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <Show when={selectedItemIds().size > 0}>
        <div
          class={flex({
            position: "sticky",
            top: "0",
            zIndex: 10,
            backgroundColor: "blue.50",
            border: "1px solid",
            borderColor: "blue.200",
            borderRadius: "md",
            padding: "3",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "sm",
          })}
        >
          <span
            class={css({
              fontSize: "sm",
              fontWeight: "medium",
              color: "blue.800",
            })}
          >
            {selectedItemIds().size} items selected
          </span>
          <div class={flex({ gap: "2" })}>
            <button
              type="button"
              onClick={() => setSelectedItemIds(new Set())}
              class={css({
                fontSize: "xs",
                padding: "1.5",
                paddingInline: "3",
                color: "gray.600",
                cursor: "pointer",
                _hover: { color: "gray.800" },
              })}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkMarkAsRead}
              disabled={updateStatusMutation.isPending}
              class={css({
                fontSize: "xs",
                fontWeight: "bold",
                padding: "1.5",
                paddingInline: "4",
                backgroundColor: "blue.600",
                color: "white",
                borderRadius: "md",
                cursor: "pointer",
                _hover: { backgroundColor: "blue.700" },
                _disabled: { opacity: 0.5, cursor: "not-allowed" },
              })}
            >
              {updateStatusMutation.isPending
                ? "Processing..."
                : "Mark as Read"}
            </button>
          </div>
        </div>
      </Show>

      <Show when={itemsQuery.hasNextPage}>
        <button
          type="button"
          onClick={() => itemsQuery.fetchNextPage()}
          disabled={itemsQuery.isFetchingNextPage}
          class={css({
            padding: "2",
            backgroundColor: "gray.100",
            borderRadius: "md",
            cursor: "pointer",
            _hover: { backgroundColor: "gray.200" },
            _disabled: { opacity: 0.5, cursor: "not-allowed" },
          })}
        >
          {itemsQuery.isFetchingNextPage ? "Loading more..." : "Load More"}
        </button>
      </Show>

      <div class={stack({ gap: "2", padding: "0" })}>
        <For each={allItems()}>
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

      <Show when={isLoading()}>
        <div
          class={css({ textAlign: "center", padding: "8", color: "gray.500" })}
        >
          Loading items...
        </div>
      </Show>

      <Show when={!isLoading() && allItems().length === 0}>
        <div
          class={css({ textAlign: "center", padding: "8", color: "gray.500" })}
        >
          No items found.
        </div>
      </Show>
    </div>
  );
}

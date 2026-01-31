import { useNavigate } from "@tanstack/solid-router";
import { createEffect, createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { useItems, useUpdateItemStatus } from "../lib/item-query";
import {
  type DateFilterValue,
  formatUnreadCount,
  getPublishedSince,
} from "../lib/item-utils";
import { useTags } from "../lib/tag-query";
import { DateFilterSelector } from "./DateFilterSelector";
import { ItemRow } from "./ItemRow";
import { ActionButton } from "./ui/ActionButton";
import { Badge } from "./ui/Badge";
import { EmptyState } from "./ui/EmptyState";
import { TagChip } from "./ui/TagChip";

interface ItemListProps {
  tagId?: string;
  dateFilter?: DateFilterValue;
  fixedControls?: boolean;
}

export function ItemList(props: ItemListProps) {
  const navigate = useNavigate();
  const updateStatusMutation = useUpdateItemStatus();
  const [selectedItemIds, setSelectedItemIds] = createSignal<Set<string>>(
    new Set(),
  );

  const tagsQuery = useTags();
  const [showRead, setShowRead] = createSignal(false);
  const [dateFilter, setDateFilter] = createSignal<DateFilterValue>(
    props.dateFilter ?? "all",
  );

  createEffect(() => {
    if (props.dateFilter) {
      setDateFilter(props.dateFilter);
    }
  });

  const handleDateFilterSelect = (value: DateFilterValue) => {
    setDateFilter(value);
    navigate({
      // @ts-expect-error
      search: (prev) => ({
        ...prev,
        publishedSince: value === "all" ? undefined : value,
      }),
    });
  };

  const itemsQuery = useItems(() => ({
    tagId: props.tagId,
    isRead: showRead() ? undefined : false,
    publishedSince: getPublishedSince(dateFilter()),
  }));

  const allItems = () =>
    itemsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const isLoading = () => itemsQuery.isLoading;

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

    await updateStatusMutation.mutateAsync({
      ids,
      isRead: true,
    });
    setSelectedItemIds(new Set<string>());
  };

  const controls = (
    <>
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
          <TagChip
            selected={props.tagId === undefined}
            onClick={() => handleTagClick(undefined)}
          >
            All
            <Show when={(tagsQuery.data?.totalUnreadCount ?? 0n) > 0n}>
              <Badge
                variant={props.tagId === undefined ? "primary" : "neutral"}
                class={css({ ml: "1.5", fontSize: "10px", minWidth: "1.5rem" })}
              >
                {formatUnreadCount(Number(tagsQuery.data?.totalUnreadCount))}
              </Badge>
            </Show>
          </TagChip>
          <For each={tagsQuery.data?.tags}>
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
            <ActionButton
              size="sm"
              variant="secondary"
              onClick={() => setSelectedItemIds(new Set())}
            >
              Clear
            </ActionButton>
            <ActionButton
              size="sm"
              variant="primary"
              onClick={handleBulkMarkAsRead}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending
                ? "Processing..."
                : "Mark as Read"}
            </ActionButton>
          </div>
        </div>
      </Show>
    </>
  );

  const listBody = (
    <div class={stack({ gap: "4", padding: "0" })}>
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
        <EmptyState title="No items found." />
      </Show>

      <Show when={itemsQuery.hasNextPage}>
        <ActionButton
          variant="secondary"
          onClick={() => itemsQuery.fetchNextPage()}
          disabled={itemsQuery.isFetchingNextPage}
        >
          {itemsQuery.isFetchingNextPage ? "Loading more..." : "Load More"}
        </ActionButton>
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

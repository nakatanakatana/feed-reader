import { For, Show, createSignal } from "solid-js";
import { stack, flex } from "../../styled-system/patterns";
import { css } from "../../styled-system/css";
import { ItemRow } from "./ItemRow";
import { useItems } from "../lib/item-query";
import { useTags } from "../lib/tag-query";
import { useNavigate } from "@tanstack/solid-router";

interface ItemListProps {
  feedId?: string;
  tagId?: string;
}

export function ItemList(props: ItemListProps) {
  const navigate = useNavigate();

  const tagsQuery = useTags();
  const itemsQuery = useItems({
    feedId: props.feedId,
    tagId: props.tagId,
  });

  const allItems = () =>
    itemsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const isLoading = () => itemsQuery.isLoading;

  const handleItemClick = (itemId: string) => {
    if (props.feedId) {
      navigate({
        to: "/feeds/$feedId/items/$itemId",
        params: { feedId: props.feedId, itemId },
      });
    } else {
      navigate({
        to: "/items/$itemId",
        params: { itemId },
        search: (prev) => ({ ...prev }),
      });
    }
  };

  const handleTagClick = (tagId: string | undefined) => {
    navigate({
      to: ".",
      search: (prev) => ({ ...prev, tagId }),
    });
  };

  return (
    <div class={stack({ gap: "4", width: "full" })}>
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
              : { bg: "gray.50", borderColor: "gray.300", color: "gray.600" }),
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

      <div class={stack({ gap: "2", padding: "0" })}>
        <For each={allItems()}>
          {(item) => (
            <ItemRow item={item} onClick={() => handleItemClick(item.id)} />
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
    </div>
  );
}

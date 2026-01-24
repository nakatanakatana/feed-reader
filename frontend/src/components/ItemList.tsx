import { For, Show } from "solid-js";
import { stack } from "../../styled-system/patterns";
import { css } from "../../styled-system/css";
import { ItemRow } from "./ItemRow";
import { useItems } from "../lib/item-query";

interface ItemListProps {
  feedId?: string;
}

export function ItemList(props: ItemListProps) {
  const itemsQuery = useItems({ feedId: props.feedId });

  const allItems = () =>
    itemsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const isLoading = () => itemsQuery.isLoading;

  return (
    <div class={stack({ gap: "4", width: "full" })}>
      <ul class={stack({ gap: "2", padding: "0", listStyleType: "none" })}>
        <For each={allItems()}>{(item) => <ItemRow item={item} />}</For>
      </ul>

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

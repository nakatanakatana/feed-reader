import { For, Show } from "solid-js";
import { stack } from "../../styled-system/patterns";
import { css } from "../../styled-system/css";
import { useItems } from "../lib/item-query";
import { ItemRow } from "./ItemRow";

interface ItemListProps {
  feedId?: string;
}

export function ItemList(props: ItemListProps) {
  const itemsQuery = useItems({ feedId: props.feedId });

  return (
    <div class={stack({ gap: "4", width: "full" })}>
      <ul class={stack({ gap: "2", padding: "0", listStyleType: "none" })}>
        <For each={itemsQuery.data?.pages.flatMap((page) => page.items)}>
          {(item) => <ItemRow item={item} />}
        </For>
      </ul>

      <Show when={itemsQuery.hasNextPage}>
        <button
          type="button"
          onClick={() => itemsQuery.fetchNextPage()}
          disabled={itemsQuery.isFetchingNextPage}
          class={css({
            padding: "2",
            borderRadius: "md",
            border: "1px solid",
            borderColor: "gray.200",
            backgroundColor: "white",
            cursor: "pointer",
            _hover: { backgroundColor: "gray.50" },
            _disabled: { opacity: 0.5, cursor: "not-allowed" },
          })}
        >
          {itemsQuery.isFetchingNextPage ? "Loading more..." : "Load More"}
        </button>
      </Show>

      <Show when={itemsQuery.isLoading}>
        <div class={css({ textAlign: "center", padding: "8", color: "gray.500" })}>
          Loading items...
        </div>
      </Show>

      <Show when={itemsQuery.isError}>
        <div class={css({ textAlign: "center", padding: "8", color: "red.500" })}>
          Error loading items. Please try again.
        </div>
      </Show>
      
      <Show when={!itemsQuery.isLoading && itemsQuery.data?.pages[0].items.length === 0}>
        <div class={css({ textAlign: "center", padding: "8", color: "gray.500" })}>
          No items found.
        </div>
      </Show>
    </div>
  );
}

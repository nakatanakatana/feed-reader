import { useLiveQuery, eq } from "@tanstack/solid-db";
import { For, Show } from "solid-js";
import { stack } from "../../styled-system/patterns";
import { css } from "../../styled-system/css";
import { items } from "../lib/db";
import { ItemRow } from "./ItemRow";

interface ItemListProps {
  feedId?: string;
}

export function ItemList(props: ItemListProps) {
  const { data: itemList } = useLiveQuery((q) => {
    let query = q.from({ item: items });
    if (props.feedId) {
      query = query.where(({ item }) => eq(item.feedId, props.feedId!));
    }
    return query.select(({ item }) => item);
  });

  const isLoading = () => !items.isReady();

  return (
    <div class={stack({ gap: "4", width: "full" })}>
      <ul class={stack({ gap: "2", padding: "0", listStyleType: "none" })}>
        <For each={itemList}>
          {(item) => <ItemRow item={item} />}
        </For>
      </ul>

      <Show when={isLoading()}>
        <div
          class={css({ textAlign: "center", padding: "8", color: "gray.500" })}
        >
          Loading items...
        </div>
      </Show>

      <Show
        when={
          !isLoading() && itemList?.length === 0
        }
      >
        <div
          class={css({ textAlign: "center", padding: "8", color: "gray.500" })}
        >
          No items found.
        </div>
      </Show>
    </div>
  );
}

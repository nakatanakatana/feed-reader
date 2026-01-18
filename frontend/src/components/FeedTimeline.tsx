import { createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { stack } from "../../styled-system/patterns";
import type { Item } from "../gen/feed/v1/feed_pb";
import { useItems, useMarkItemRead } from "../lib/items";
import { ItemCard } from "./ItemCard";
import { ItemDetail } from "./ItemDetail";

interface FeedTimelineProps {
  feedId?: string;
}

export function FeedTimeline(props: FeedTimelineProps) {
  const [unreadOnly, setUnreadOnly] = createSignal(false);
  const [selectedItem, setSelectedItem] = createSignal<Item | null>(null);

  const query = useItems({
    get feedId() {
      return props.feedId;
    },
    get unreadOnly() {
      return unreadOnly();
    },
  });
  const markRead = useMarkItemRead();

  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
    if (!item.isRead) {
      markRead.mutate(item.id);
    }
  };

  return (
    <div class={stack({ gap: "6" })}>
      <div
        class={css({
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        })}
      >
        <h2 class={css({ fontSize: "2xl", fontWeight: "bold" })}>
          {props.feedId ? "Feed Articles" : "Global Timeline"}
        </h2>
        <label
          class={css({
            display: "flex",
            alignItems: "center",
            gap: "2",
            fontSize: "sm",
            cursor: "pointer",
          })}
        >
          <input
            type="checkbox"
            checked={unreadOnly()}
            onChange={(e) => setUnreadOnly(e.currentTarget.checked)}
          />
          Unread Only
        </label>
      </div>
      <Show when={query.isLoading}>
        <p>Loading items...</p>
      </Show>
      <Show when={query.isError}>
        <p class={css({ color: "red.500" })}>Error: {query.error?.message}</p>
      </Show>
      <div class={stack({ gap: "4" })}>
        <For each={query.data?.pages.flatMap((page) => page.items)}>
          {(item) => (
            <ItemCard
              item={item}
              onClick={handleItemClick}
              onMarkRead={(id) => markRead.mutate(id)}
            />
          )}
        </For>
      </div>
      <Show when={query.hasNextPage}>
        <button
          type="button"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          class={css({
            padding: "2",
            backgroundColor: "gray.100",
            borderRadius: "md",
            cursor: "pointer",
            _hover: { backgroundColor: "gray.200" },
            _disabled: { opacity: 0.5, cursor: "not-allowed" },
          })}
        >
          {query.isFetchingNextPage ? "Loading more..." : "Load More"}
        </button>
      </Show>
      <Show when={selectedItem()}>
        {(item) => (
          <ItemDetail item={item()} onClose={() => setSelectedItem(null)} />
        )}
      </Show>{" "}
    </div>
  );
}

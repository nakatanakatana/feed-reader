import { useLiveQuery } from "@tanstack/solid-db";
import { Link } from "@tanstack/solid-router";
import { For, Show, createSignal } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { feeds } from "../lib/db";

export function FeedList() {
  const { data: feedList } = useLiveQuery((q) => 
    q.from({ feed: feeds }).select(({ feed }) => feed)
  );
  const [deleteError, setDeleteError] = createSignal<Error | null>(null);

  const handleDelete = async (uuid: string) => {
    setDeleteError(null);
    try {
      await feeds.delete(uuid);
    } catch (e) {
      setDeleteError(e instanceof Error ? e : new Error("Failed to delete feed"));
    }
  };
  
  // Loading state approximation
  const isLoading = () => !feeds.isReady();

  return (
    <div class={stack({ gap: "4" })}>
      <h2 class={css({ fontSize: "xl", fontWeight: "semibold" })}>
        Your Feeds
      </h2>
      <Show when={isLoading()}>
        <p>Loading...</p>
      </Show>
      <Show when={deleteError()}>
        <p class={css({ color: "red.500" })}>
          Delete Error: {deleteError()?.message}
        </p>
      </Show>
      <ul class={stack({ gap: "2" })}>
        <For each={feedList}>
          {(feed) => (
            <li
              class={flex({
                justifyContent: "space-between",
                alignItems: "center",
                padding: "3",
                border: "1px solid",
                borderColor: "gray.100",
                borderRadius: "md",
                _hover: { backgroundColor: "gray.50" },
              })}
            >
              <div class={stack({ gap: "0" })}>
                <Link
                  to="/feeds/$feedId"
                  params={{ feedId: feed.uuid }}
                  class={css({
                    fontWeight: "medium",
                    _hover: { textDecoration: "underline", color: "blue.600" },
                  })}
                >
                  {feed.title || "Untitled Feed"}
                </Link>
                <span class={css({ fontSize: "xs", color: "gray.500" })}>
                  {feed.url}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(feed.uuid)}
                class={css({
                  color: "red.500",
                  padding: "1",
                  paddingInline: "2",
                  borderRadius: "md",
                  fontSize: "sm",
                  cursor: "pointer",
                  _hover: {
                    backgroundColor: "red.50",
                    textDecoration: "underline",
                  },
                  _disabled: { color: "gray.400", cursor: "not-allowed" },
                })}
              >
                Delete
              </button>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}

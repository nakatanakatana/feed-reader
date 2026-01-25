import { useLiveQuery } from "@tanstack/solid-db";
import { Link } from "@tanstack/solid-router";
import { For, Show, createSignal } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { feeds } from "../lib/db";
import { useTags } from "../lib/tag-query";

export function FeedList() {
  const [selectedTagId, setSelectedTagId] = createSignal<string | undefined>();
  const tagsQuery = useTags();

  const { data: feedList } = useLiveQuery((q) => {
    let query = q.from({ feed: feeds });
    const tagId = selectedTagId();
    if (tagId) {
      // NOTE: solid-db where currently has issues with boolean expressions in some versions.
      // We perform manual filtering on the result for now to ensure stability.
      return query; 
    }
    return query;
  });

  const filteredFeeds = () => {
    const list = feedList ?? [];
    const tagId = selectedTagId();
    if (!tagId) return list;
    return list.filter((f) => f.tags?.some((t) => t.id === tagId));
  };

  const [deleteError, setDeleteError] = createSignal<Error | null>(null);

  const handleDelete = async (uuid: string) => {
    setDeleteError(null);
    try {
      await feeds.delete(uuid);
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e : new Error("Failed to delete feed"),
      );
    }
  };

  // Loading state approximation
  const isLoading = () => !feeds.isReady();

  return (
    <div class={stack({ gap: "4" })}>
      <div class={flex({ justifyContent: "space-between", alignItems: "center" })}>
        <h2 class={css({ fontSize: "xl", fontWeight: "semibold" })}>
          Your Feeds
        </h2>
        <div class={flex({ gap: "2", alignItems: "center" })}>
          <span class={css({ fontSize: "sm", color: "gray.600" })}>Filter:</span>
          <button
            onClick={() => setSelectedTagId(undefined)}
            class={css({
              px: "2",
              py: "0.5",
              rounded: "md",
              fontSize: "xs",
              cursor: "pointer",
              border: "1px solid",
              ...(selectedTagId() === undefined
                ? { bg: "blue.100", borderColor: "blue.500", color: "blue.700" }
                : { bg: "gray.50", borderColor: "gray.300", color: "gray.600" }),
            })}
          >
            All
          </button>
          <For each={tagsQuery.data?.tags}>
            {(tag) => (
              <button
                onClick={() => setSelectedTagId(tag.id)}
                class={css({
                  px: "2",
                  py: "0.5",
                  rounded: "md",
                  fontSize: "xs",
                  cursor: "pointer",
                  border: "1px solid",
                  ...(selectedTagId() === tag.id
                    ? { bg: "blue.100", borderColor: "blue.500", color: "blue.700" }
                    : { bg: "gray.50", borderColor: "gray.300", color: "gray.600" }),
                })}
              >
                {tag.name}
              </button>
            )}
          </For>
        </div>
      </div>

      <Show when={isLoading()}>
        <p>Loading...</p>
      </Show>
      <Show when={deleteError()}>
        <p class={css({ color: "red.500" })}>
          Delete Error: {deleteError()?.message}
        </p>
      </Show>
      <ul class={stack({ gap: "2" })}>
        <For each={filteredFeeds()}>
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
              <div class={stack({ gap: "1" })}>
                <div class={flex({ gap: "2", alignItems: "center" })}>
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
                  <div class={flex({ gap: "1" })}>
                    <For each={feed.tags}>
                      {(tag) => (
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
                          {tag.name}
                        </span>
                      )}
                    </For>
                  </div>
                </div>
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
import { useLiveQuery } from "@tanstack/solid-db";
import { Link } from "@tanstack/solid-router";
import { For, Show, createSignal } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { feeds } from "../lib/db";
import { useTags } from "../lib/tag-query";
import { ManageTagsModal } from "./ManageTagsModal";

export function FeedList() {
  const [selectedTagId, setSelectedTagId] = createSignal<string | undefined | null>();
  const [sortBy, setSortBy] = createSignal<string>("title_asc");
  const [selectedFeedUuids, setSelectedFeedUuids] = createSignal<string[]>([]);
  const [isManageModalOpen, setIsManageModalOpen] = createSignal(false);

  const tagsQuery = useTags();

  const { data: feedList } = useLiveQuery((q) => {
    const query = q.from({ feed: feeds });
    return query;
  });

  const filteredFeeds = () => {
    const list = feedList ?? [];
    const tagId = selectedTagId();
    if (tagId === undefined) return list;
    if (tagId === null) return list.filter((f) => !f.tags || f.tags.length === 0);
    return list.filter((f) => f.tags?.some((t) => t.id === tagId));
  };

  const sortedFeeds = () => {
    const list = [...filteredFeeds()];
    const sort = sortBy();

    return list.sort((a, b) => {
      switch (sort) {
        case "title_asc":
          return (a.title || "").localeCompare(b.title || "");
        case "title_desc":
          return (b.title || "").localeCompare(a.title || "");
        case "created_at_desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "created_at_asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "last_fetched_at_desc":
          return (
            new Date(b.lastFetchedAt || 0).getTime() -
            new Date(a.lastFetchedAt || 0).getTime()
          );
        default:
          return 0;
      }
    });
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

  const toggleFeedSelection = (uuid: string) => {
    if (selectedFeedUuids().includes(uuid)) {
      setSelectedFeedUuids(selectedFeedUuids().filter((u) => u !== uuid));
    } else {
      setSelectedFeedUuids([...selectedFeedUuids(), uuid]);
    }
  };

  // Loading state approximation
  const isLoading = () => !feeds.isReady();

  return (
    <div class={stack({ gap: "4" })}>
      <div
        class={flex({ justifyContent: "space-between", alignItems: "center" })}
      >
        <div class={flex({ gap: "4", alignItems: "center" })}>
          <h2 class={css({ fontSize: "xl", fontWeight: "semibold" })}>
            Your Feeds
          </h2>
          <Show when={selectedFeedUuids().length > 0}>
            <button
              type="button"
              onClick={() => setIsManageModalOpen(true)}
              class={css({
                px: "3",
                py: "1.5",
                bg: "blue.600",
                color: "white",
                rounded: "md",
                fontSize: "sm",
                cursor: "pointer",
                hover: { bg: "blue.700" },
              })}
            >
              Manage Tags ({selectedFeedUuids().length})
            </button>
          </Show>
        </div>
        <div class={flex({ gap: "2", alignItems: "center" })}>
          <label for="sort-by" class={css({ fontSize: "sm", color: "gray.600" })}>
            Sort by:
          </label>
          <select
            id="sort-by"
            aria-label="Sort by"
            value={sortBy()}
            onInput={(e) => setSortBy(e.currentTarget.value)}
            class={css({
              fontSize: "xs",
              px: "2",
              py: "0.5",
              rounded: "md",
              border: "1px solid",
              borderColor: "gray.300",
              bg: "white",
            })}
          >
            <option value="title_asc">Title (A-Z)</option>
            <option value="title_desc">Title (Z-A)</option>
            <option value="created_at_desc">Date Added (Newest)</option>
            <option value="created_at_asc">Date Added (Oldest)</option>
            <option value="last_fetched_at_desc">Last Fetched (Newest)</option>
          </select>
          <span class={css({ fontSize: "sm", color: "gray.600", ml: "2" })}>
            Filter:
          </span>
          <button
            type="button"
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
                : {
                    bg: "gray.50",
                    borderColor: "gray.300",
                    color: "gray.600",
                  }),
            })}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setSelectedTagId(null)}
            class={css({
              px: "2",
              py: "0.5",
              rounded: "md",
              fontSize: "xs",
              cursor: "pointer",
              border: "1px solid",
              ...(selectedTagId() === null
                ? { bg: "blue.100", borderColor: "blue.500", color: "blue.700" }
                : {
                    bg: "gray.50",
                    borderColor: "gray.300",
                    color: "gray.600",
                  }),
            })}
          >
            Uncategorized
          </button>
          <For each={tagsQuery.data?.tags}>
            {(tag) => (
              <button
                type="button"
                onClick={() => setSelectedTagId(tag.id)}
                class={css({
                  px: "2",
                  py: "0.5",
                  rounded: "md",
                  fontSize: "xs",
                  cursor: "pointer",
                  border: "1px solid",
                  ...(selectedTagId() === tag.id
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
        <For each={sortedFeeds()}>
          {(feed) => (
            <li
              class={flex({
                justifyContent: "space-between",
                alignItems: "center",
                padding: "3",
                border: "1px solid",
                borderColor: "gray.100",
                borderRadius: "md",
                gap: "3",
                _hover: { backgroundColor: "gray.50" },
              })}
            >
              <div class={flex({ gap: "3", alignItems: "center", flex: 1 })}>
                <input
                  type="checkbox"
                  checked={selectedFeedUuids().includes(feed.uuid)}
                  onChange={() => toggleFeedSelection(feed.uuid)}
                  class={css({ cursor: "pointer" })}
                />
                <div class={stack({ gap: "1" })}>
                  <div class={flex({ gap: "2", alignItems: "center" })}>
                    <Link
                      to="/feeds/$feedId"
                      params={{ feedId: feed.uuid }}
                      class={css({
                        fontWeight: "medium",
                        _hover: {
                          textDecoration: "underline",
                          color: "blue.600",
                        },
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

      <ManageTagsModal
        isOpen={isManageModalOpen()}
        onClose={() => {
          setIsManageModalOpen(false);
          setSelectedFeedUuids([]);
        }}
        feedIds={selectedFeedUuids()}
      />
    </div>
  );
}

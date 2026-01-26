import { useLiveQuery } from "@tanstack/solid-db";
import { Link } from "@tanstack/solid-router";
import { For, Show, createSignal } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { feeds } from "../lib/db";
import { useTags } from "../lib/tag-query";
import { ManageTagsModal } from "./ManageTagsModal";

export function FeedList() {
  const [selectedTagId, setSelectedTagId] = createSignal<
    string | undefined | null
  >();
  const [sortBy, setSortBy] = createSignal<string>("title_asc");
  const [selectedFeedIds, setSelectedFeedIds] = createSignal<string[]>([]);
  const [isManageModalOpen, setIsManageModalOpen] = createSignal(false);

  const tagsQuery = useTags();

  const { data: feedList } = useLiveQuery((q) => {
    const query = q.from({ feed: feeds });
    return query;
  });

  const filteredFeeds = () => {
    const list = (feedList as any[]) ?? [];
    const tagId = selectedTagId();
    if (tagId === undefined) return list;
    if (tagId === null)
      return list.filter((f) => !f.tags || f.tags.length === 0);
    return list.filter((f) => f.tags?.some((t: any) => t.id === tagId));
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
          return (
            new Date(b.createdAt as string).getTime() -
            new Date(a.createdAt as string).getTime()
          );
        case "created_at_asc":
          return (
            new Date(a.createdAt as string).getTime() -
            new Date(b.createdAt as string).getTime()
          );
        case "last_fetched_at_desc":
          return (
            new Date((b.lastFetchedAt as string) || 0).getTime() -
            new Date((a.lastFetchedAt as string) || 0).getTime()
          );
        default:
          return 0;
      }
    });
  };

  const [deleteError, setDeleteError] = createSignal<Error | null>(null);

  const handleDelete = async (id: string) => {
    setDeleteError(null);
    try {
      await feeds.delete(id);
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e : new Error("Failed to delete feed"),
      );
    }
  };

  const toggleFeedSelection = (id: string) => {
    if (selectedFeedIds().includes(id)) {
      setSelectedFeedIds(selectedFeedIds().filter((u) => u !== id));
    } else {
      setSelectedFeedIds([...selectedFeedIds(), id]);
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
          <Show when={selectedFeedIds().length > 0}>
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
                _hover: { bg: "blue.700" },
              })}
            >
              Manage Tags ({selectedFeedIds().length})
            </button>
          </Show>
        </div>
        <div class={flex({ gap: "2", alignItems: "center" })}>
          <label
            for="sort-by"
            class={css({ fontSize: "sm", color: "gray.600" })}
          >
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
          {(feed: any) => (
            <li
              onClick={() => toggleFeedSelection(feed.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleFeedSelection(feed.id);
                }
              }}
              class={flex({
                justifyContent: "space-between",
                alignItems: "center",
                padding: "3",
                border: "1px solid",
                borderColor: "gray.100",
                borderRadius: "md",
                gap: "3",
                cursor: "pointer",
                _hover: { backgroundColor: "gray.50" },
              })}
            >
              <div class={flex({ gap: "3", alignItems: "center", flex: 1 })}>
                <input
                  type="checkbox"
                  checked={selectedFeedIds().includes(feed.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleFeedSelection(feed.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  class={css({ cursor: "pointer" })}
                />
                <div class={stack({ gap: "1" })}>
                  <div class={flex({ gap: "2", alignItems: "center" })}>
                    <a
                      href={feed.link || feed.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      class={css({
                        fontWeight: "medium",
                        _hover: {
                          textDecoration: "underline",
                          color: "blue.600",
                        },
                      })}
                    >
                      {feed.title || "Untitled Feed"}
                    </a>
                    <Link
                      to="/feeds/$feedId"
                      params={{ feedId: feed.id }}
                      aria-label="View items"
                      onClick={(e) => e.stopPropagation()}
                      class={css({
                        display: "flex",
                        alignItems: "center",
                        color: "gray.400",
                        _hover: { color: "blue.600" },
                      })}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <title>View items</title>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(feed.id);
                }}
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
          setSelectedFeedIds([]);
        }}
        feedIds={selectedFeedIds()}
      />
    </div>
  );
}

import { useLiveQuery } from "@tanstack/solid-db";
import { createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { type Feed, feeds } from "../lib/db";
import { useRefreshFeeds } from "../lib/feed-query";
import { fetchingState } from "../lib/fetching-state";
import { formatDate, formatUnreadCount } from "../lib/item-utils";
import { useTags } from "../lib/tag-query";
import { ManageTagsModal } from "./ManageTagsModal";

export function FeedList() {
  console.log("DEBUG: Rendering FeedList component");
  const refreshMutation = useRefreshFeeds();
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

  const totalUnreadCount = () => {
    const list = (feedList as unknown as Feed[]) ?? [];
    return list.reduce((acc, feed) => acc + Number(feed.unreadCount || 0), 0);
  };

  const filteredFeeds = () => {
    const list = (feedList as unknown as Feed[]) ?? [];
    const tagId = selectedTagId();
    if (tagId === undefined) return list;
    if (tagId === null) return list;
    return list;
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

  const isLoading = () => feedList === undefined;

  return (
    <div
      class={css({
        display: "flex",
        flexDirection: "column",
        gap: "4",
        height: "100%",
        minHeight: 0,
      })}
    >
      <div
        class={css({
          display: "flex",
          justifyContent: "space-between",
          alignItems: "stretch",
          flexDirection: "column",
          gap: "4",
          position: "sticky",
          top: 0,
          zIndex: 2,
          backgroundColor: "white",
          paddingBottom: "3",
          md: {
            alignItems: "center",
            flexDirection: "row",
          },
        })}
      >
        <div
          class={css({
            display: "flex",
            gap: "4",
            alignItems: "stretch",
            justifyContent: "space-between",
            flexDirection: "column",
            sm: {
              alignItems: "center",
              flexDirection: "row",
            },
          })}
        >
          <div class={flex({ gap: "4", alignItems: "center" })}>
            <h2
              class={css({
                fontSize: "xl",
                fontWeight: "semibold",
                display: "none",
                sm: { display: "block" },
              })}
            >
              Your Feeds
            </h2>
            <div
              class={css({
                bg: "blue.50",
                color: "blue.700",
                px: "3",
                py: "1.5",
                rounded: "md",
                fontSize: "sm",
                fontWeight: "bold",
                border: "1px solid",
                borderColor: "blue.200",
              })}
            >
              Total Unread: {totalUnreadCount()}
            </div>
          </div>
          <Show when={selectedFeedIds().length > 0}>
            <div class={flex({ gap: "2", alignItems: "center" })}>
              <button
                type="button"
                onClick={() =>
                  refreshMutation.mutate({ ids: selectedFeedIds() })
                }
                disabled={refreshMutation.isPending}
                class={css({
                  display: "none",
                  sm: { display: "block" },
                  px: "3",
                  py: "1.5",
                  bg: "blue.100",
                  color: "blue.700",
                  rounded: "md",
                  fontSize: "sm",
                  fontWeight: "bold",
                  cursor: "pointer",
                  _hover: { bg: "blue.200" },
                  _disabled: { opacity: 0.5, cursor: "not-allowed" },
                })}
              >
                {refreshMutation.isPending ? "Fetching..." : "Fetch Selected"}
              </button>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(true)}
                class={css({
                  display: "none",
                  sm: { display: "block" },
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
            </div>
          </Show>
        </div>
        <div
          class={css({
            display: "flex",
            gap: "2",
            alignItems: "center",
            flexWrap: "nowrap",
            justifyContent: "flex-start",
            overflowX: "auto",
            whiteSpace: "nowrap",
            maxWidth: "100%",
            pr: "1",
            md: {
              justifyContent: "flex-end",
            },
          })}
        >
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
              py: "1.5",
              rounded: "md",
              border: "1px solid",
              borderColor: "gray.300",
              bg: "white",
            })}
          >
            <option value="title_asc">Title (A-Z)</option>
            <option value="title_desc">Title (Z-A)</option>
          </select>
          <span class={css({ fontSize: "sm", color: "gray.600", ml: "2" })}>
            Filter:
          </span>
          <button
            type="button"
            onClick={() => setSelectedTagId(undefined)}
            class={css({
              px: "3",
              py: "1.5",
              minH: "10",
              rounded: "md",
              fontSize: "xs",
              cursor: "pointer",
              border: "1px solid",
              display: "inline-flex",
              alignItems: "center",
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
            <Show when={(tagsQuery.data?.totalUnreadCount ?? 0n) > 0n}>
              <span
                class={css({
                  ml: "1.5",
                  bg: selectedTagId() === undefined ? "blue.600" : "gray.200",
                  color: selectedTagId() === undefined ? "white" : "gray.700",
                  px: "1.5",
                  py: "0.5",
                  rounded: "full",
                  fontSize: "xs",
                  fontWeight: "bold",
                  minWidth: "1.5rem",
                  textAlign: "center",
                })}
              >
                {formatUnreadCount(Number(tagsQuery.data?.totalUnreadCount))}
              </span>
            </Show>
          </button>
          <For each={tagsQuery.data?.tags}>
            {(tag) => (
              <button
                type="button"
                onClick={() => setSelectedTagId(tag.id)}
                class={css({
                  px: "3",
                  py: "1.5",
                  minH: "10",
                  rounded: "md",
                  fontSize: "xs",
                  cursor: "pointer",
                  border: "1px solid",
                  display: "inline-flex",
                  alignItems: "center",
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
                <Show when={(tag.unreadCount ?? 0n) > 0n}>
                  <span
                    class={css({
                      ml: "1.5",
                      bg: selectedTagId() === tag.id ? "blue.600" : "gray.200",
                      color: selectedTagId() === tag.id ? "white" : "gray.700",
                      px: "1.5",
                      py: "0.5",
                      rounded: "full",
                      fontSize: "xs",
                      fontWeight: "bold",
                      minWidth: "1.5rem",
                      textAlign: "center",
                    })}
                  >
                    {formatUnreadCount(Number(tag.unreadCount))}
                  </span>
                </Show>
              </button>
            )}
          </For>
        </div>
      </div>

      <div
        class={css({
          display: "flex",
          flexDirection: "column",
          gap: "2",
          flex: "1",
          minHeight: 0,
        })}
      >
        <Show when={isLoading()}>
          <p>Loading...</p>
        </Show>
        <Show when={deleteError()}>
          <p class={css({ color: "red.500" })}>
            Delete Error: {deleteError()?.message}
          </p>
        </Show>
        <div
          class={css({
            flex: "1",
            minHeight: 0,
            overflowY: "auto",
            pr: "1",
          })}
        >
          <ul class={stack({ gap: "2" })}>
            <For each={sortedFeeds()}>
              {(feed: Feed) => (
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
                  <div
                    class={flex({ gap: "3", alignItems: "center", flex: 1 })}
                  >
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
                        <div class={flex({ gap: "2", alignItems: "center" })}>
                          <Show when={fetchingState.isFetching(feed.id)}>
                            <div
                              class={css({
                                width: "4",
                                height: "4",
                                border: "2px solid",
                                borderColor: "blue.200",
                                borderTopColor: "blue.600",
                                borderRadius: "full",
                                animation: "spin 1s linear infinite",
                              })}
                              title="Fetching..."
                            />
                          </Show>
                          <Show when={fetchingState.error(feed.id)}>
                            <div
                              class={css({
                                color: "red.500",
                                cursor: "help",
                                display: "flex",
                                alignItems: "center",
                              })}
                              title={fetchingState.error(feed.id)}
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
                                <title>Error fetching feed</title>
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                            </div>
                          </Show>
                        </div>
                      </div>
                      <span class={css({ fontSize: "xs", color: "gray.500" })}>
                        {feed.url}
                      </span>
                      <span class={css({ fontSize: "xs", color: "gray.500" })}>
                        Last fetched:{" "}
                        {feed.lastFetchedAt
                          ? formatDate(feed.lastFetchedAt)
                          : "Not fetched yet"}
                      </span>
                    </div>
                  </div>
                  <div class={flex({ gap: "2", alignItems: "center" })}>
                    <Show when={Number(feed.unreadCount || 0) > 0}>
                      <span
                        class={css({
                          bg: "blue.100",
                          color: "blue.700",
                          px: "2",
                          py: "0.5",
                          rounded: "full",
                          fontSize: "xs",
                          fontWeight: "bold",
                        })}
                      >
                        {feed.unreadCount?.toString()}
                      </span>
                    </Show>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        refreshMutation.mutate({ ids: [feed.id] });
                      }}
                      disabled={fetchingState.isFetching(feed.id)}
                      class={css({
                        color: "blue.600",
                        padding: "1",
                        paddingInline: "2",
                        borderRadius: "md",
                        fontSize: "sm",
                        cursor: "pointer",
                        _hover: {
                          backgroundColor: "blue.50",
                          textDecoration: "underline",
                        },
                        _disabled: {
                          color: "gray.400",
                          cursor: "not-allowed",
                          textDecoration: "none",
                        },
                      })}
                    >
                      {fetchingState.isFetching(feed.id)
                        ? "Fetching..."
                        : "Fetch"}
                    </button>
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
                  </div>
                </li>
              )}
            </For>
          </ul>
        </div>
      </div>

      <ManageTagsModal
        isOpen={isManageModalOpen()}
        onClose={() => {
          setIsManageModalOpen(false);
          setSelectedFeedIds([]);
        }}
        feedIds={selectedFeedIds()}
      />

      <Show when={selectedFeedIds().length > 0}>
        <div
          class={css({
            display: "block",
            sm: { display: "none" },
            position: "fixed",
            bottom: "6",
            right: "6",
            zIndex: 100,
          })}
          style={{ position: "fixed" }}
        >
          <div class={stack({ gap: "2", alignItems: "flex-end" })}>
            <button
              type="button"
              onClick={() => refreshMutation.mutate({ ids: selectedFeedIds() })}
              disabled={refreshMutation.isPending}
              class={css({
                px: "4",
                py: "4",
                bg: "blue.100",
                color: "blue.700",
                rounded: "full",
                fontSize: "sm",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "lg",
                _hover: { bg: "blue.200" },
                _active: { transform: "scale(0.95)" },
                _disabled: { opacity: 0.5, cursor: "not-allowed" },
              })}
              aria-label="Fetch Selected"
            >
              <div class={flex({ gap: "2", alignItems: "center" })}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <title>Manual refresh</title>
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                <span>
                  {refreshMutation.isPending ? "Fetching..." : "Fetch"}
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setIsManageModalOpen(true)}
              class={css({
                px: "4",
                py: "4",
                bg: "blue.600",
                color: "white",
                rounded: "full",
                fontSize: "sm",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "lg",
                _hover: { bg: "blue.700" },
                _active: { transform: "scale(0.95)" },
              })}
              aria-label="Manage Tags"
            >
              <div class={flex({ gap: "2", alignItems: "center" })}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
                  <path d="M7 7h.01" />
                </svg>
                <span>Tags ({selectedFeedIds().length})</span>
              </div>
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}

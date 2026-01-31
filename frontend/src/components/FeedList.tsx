import { create } from "@bufbuild/protobuf";
import { useLiveQuery } from "@tanstack/solid-db";
import { createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { RefreshFeedsRequestSchema } from "../gen/feed/v1/feed_pb";
import { type Feed, feeds } from "../lib/db";
import { useRefreshFeeds } from "../lib/feed-query";
import { fetchingState } from "../lib/fetching-state";
import { formatDate, formatUnreadCount } from "../lib/item-utils";
import { useTags } from "../lib/tag-query";
import { ManageTagsModal } from "./ManageTagsModal";
import { ActionButton } from "./ui/ActionButton";
import { Badge } from "./ui/Badge";
import { EmptyState } from "./ui/EmptyState";

export function FeedList() {
  const refreshMutation = useRefreshFeeds();
  const [selectedTagId, setSelectedTagId] = createSignal<
    string | undefined | null
  >();
  const [sortBy, setSortBy] = createSignal<string>("title_asc");
  const [selectedFeedIds, setSelectedFeedIds] = createSignal<string[]>([]);
  const [isManageModalOpen, setIsManageModalOpen] = createSignal(false);

  const tagsQuery = useTags();

  const { data: feedList } = useLiveQuery((q) => {
    const tagId = selectedTagId();
    const currentSort = sortBy();
    let query = q.from({ feed: feeds });

    if (tagId === null) {
      query = query.fn.where(
        (row) => !row.feed.tags || row.feed.tags.length === 0,
      );
    }

    if (tagId && tagId !== null) {
      query = query.fn.where(
        (row) => row.feed.tags?.some((tag) => tag.id === tagId) ?? false,
      );
    }

    if (currentSort === "title_desc") {
      query = query.orderBy(({ feed }) => feed.title, "desc");
    } else {
      query = query.orderBy(({ feed }) => feed.title, "asc");
    }

    return query;
  });

  const filteredFeeds = () => {
    const list = (feedList as unknown as Feed[]) ?? [];
    const tagId = selectedTagId();
    if (tagId === undefined) return list;
    if (tagId === null) {
      return list.filter((feed) => !feed.tags || feed.tags.length === 0);
    }
    return list.filter(
      (feed) => feed.tags?.some((tag) => tag.id === tagId) ?? false,
    );
  };

  const sortedFeeds = () => {
    const list = [...filteredFeeds()];
    const sort = sortBy();

    return list.sort((a, b) => {
      if (sort === "title_desc") {
        return (b.title || "").localeCompare(a.title || "");
      }
      return (a.title || "").localeCompare(b.title || "");
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
        flex: "1",
        minHeight: 0,
        width: "100%",
        minWidth: 0,
      })}
    >
      <div
        class={css({
          display: "flex",
          justifyContent: "space-between",
          alignItems: "stretch",
          flexDirection: "column",
          gap: "2",
          position: "sticky",
          top: 0,
          zIndex: 2,
          backgroundColor: "gray.50",
          paddingBottom: "1",
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
            justifyContent: "flex-end",
            flexDirection: "column",
            sm: {
              alignItems: "center",
              flexDirection: "row",
            },
          })}
        >
          <div
            class={flex({ gap: "2", alignItems: "center" })}
            style={{
              "min-height": "2rem",
              visibility: selectedFeedIds().length > 0 ? "visible" : "hidden",
              "pointer-events": selectedFeedIds().length > 0 ? "auto" : "none",
            }}
          >
            <div class={css({ display: "none", sm: { display: "block" } })}>
              <ActionButton
                size="sm"
                variant="secondary"
                onClick={() =>
                  refreshMutation.mutate(
                    create(RefreshFeedsRequestSchema, {
                      ids: selectedFeedIds(),
                    }),
                  )
                }
                disabled={refreshMutation.isPending}
              >
                {refreshMutation.isPending ? "Fetching..." : "Fetch Selected"}
              </ActionButton>
            </div>
            <div
              class={css({ display: "none", sm: { display: "block" } })}
              data-role="header-manage-tags"
            >
              <ActionButton
                size="sm"
                variant="primary"
                onClick={() => setIsManageModalOpen(true)}
              >
                Manage Tags ({selectedFeedIds().length})
              </ActionButton>
            </div>
          </div>
        </div>
        <div
          class={css({
            display: "flex",
            gap: "2",
            alignItems: "center",
            flexWrap: "nowrap",
            justifyContent: "flex-start",
            width: "100%",
            minWidth: 0,
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
          <select
            aria-label="Filter by tag"
            value={selectedTagId() ?? "all"}
            onInput={(e) => {
              const value = e.currentTarget.value;
              if (value === "all") {
                setSelectedTagId(undefined);
              } else if (value === "untagged") {
                setSelectedTagId(null);
              } else {
                setSelectedTagId(value);
              }
            }}
            class={css({
              fontSize: "xs",
              px: "2",
              py: "1.5",
              rounded: "md",
              border: "1px solid",
              borderColor: "gray.300",
              bg: "white",
              minW: "10rem",
            })}
          >
            <option value="all">
              All
              {tagsQuery.data?.totalUnreadCount
                ? ` (${formatUnreadCount(Number(tagsQuery.data.totalUnreadCount))})`
                : ""}
            </option>
            <option value="untagged">Untagged</option>
            <For each={tagsQuery.data?.tags}>
              {(tag) => (
                <option value={tag.id}>
                  {tag.name}
                  {tag.unreadCount && tag.unreadCount > 0n
                    ? ` (${formatUnreadCount(Number(tag.unreadCount))})`
                    : ""}
                </option>
              )}
            </For>
          </select>
        </div>
      </div>

      <div
        class={css({
          display: "flex",
          flexDirection: "column",
          gap: "2",
          flex: "1",
          minHeight: 0,
          backgroundColor: "white",
        })}
      >
        <Show when={isLoading()}>
          <p class={css({ color: "gray.500", fontSize: "sm" })}>Loading...</p>
        </Show>
        <Show when={deleteError()}>
          <p class={css({ color: "red.500" })}>
            Delete Error: {deleteError()?.message}
          </p>
        </Show>
        <Show when={!isLoading() && sortedFeeds().length === 0}>
          <EmptyState title="No feeds found." />
        </Show>
        <div
          class={css({
            flex: "1",
            minHeight: 0,
            overflowY: "auto",
            pr: "1",
            width: "100%",
          })}
        >
          <ul class={stack({ gap: "2", width: "full" })}>
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
                      <Badge variant="primary">
                        {feed.unreadCount?.toString()}
                      </Badge>
                    </Show>
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      onClickEvent={(e) => {
                        e.stopPropagation();
                        refreshMutation.mutate(
                          create(RefreshFeedsRequestSchema, {
                            ids: [feed.id],
                          }),
                        );
                      }}
                      disabled={fetchingState.isFetching(feed.id)}
                    >
                      {fetchingState.isFetching(feed.id)
                        ? "Fetching..."
                        : "Fetch"}
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="danger"
                      onClickEvent={(e) => {
                        e.stopPropagation();
                        handleDelete(feed.id);
                      }}
                    >
                      Delete
                    </ActionButton>
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
            <ActionButton
              variant="secondary"
              onClick={() =>
                refreshMutation.mutate(
                  create(RefreshFeedsRequestSchema, {
                    ids: selectedFeedIds(),
                  }),
                )
              }
              disabled={refreshMutation.isPending}
              ariaLabel="Fetch Selected"
              class={css({
                padding: "4",
                borderRadius: "full",
                boxShadow: "lg",
              })}
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
            </ActionButton>
            <ActionButton
              variant="primary"
              onClick={() => setIsManageModalOpen(true)}
              ariaLabel="Manage Tags"
              class={css({
                padding: "4",
                borderRadius: "full",
                boxShadow: "lg",
              })}
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
            </ActionButton>
          </div>
        </div>
      </Show>
    </div>
  );
}

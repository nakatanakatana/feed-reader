import { eq, isUndefined, useLiveQuery } from "@tanstack/solid-db";
import { useMutation } from "@tanstack/solid-query";
import { createEffect, createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { type Feed, feedDelete, feeds, feedTag, refreshFeeds, exportFeeds } from "../lib/db";
import { fetchingState } from "../lib/fetching-state";
import { formatDate, formatUnreadCount } from "../lib/item-utils";
import { tagsFeedQuery } from "../lib/tag-db";
import { BulkActionBar } from "./BulkActionBar";
import { ManageTagsModal } from "./ManageTagsModal";
import { ActionButton } from "./ui/ActionButton";
import { Badge } from "./ui/Badge";
import { EmptyState } from "./ui/EmptyState";

export function FeedList() {
  const refreshMutation = useMutation(() => ({
    mutationFn: refreshFeeds,
  }));
  const [selectedTagId, setSelectedTagId] = createSignal<
    string | undefined | null
  >();
  const [sortBy, setSortBy] = createSignal<string>("title_asc");
  const [selectedFeedIds, setSelectedFeedIds] = createSignal<string[]>([]);
  const [isManageModalOpen, setIsManageModalOpen] = createSignal(false);

  const tagsQuery = useLiveQuery((q) => {
    return q.from({ tag: tagsFeedQuery }).select(({ tag }) => ({ ...tag }));
  });

  const feedListQuery = useLiveQuery((q) => {
    const tagId = selectedTagId();
    const currentSort = sortBy();
    let query = q.from({ feed: feeds });

    if (tagId === null) {
      // untagged
      query = query
        .leftJoin({ ft: feedTag }, ({ feed, ft }) => eq(feed.id, ft.feedId))
        .where(({ ft }) => isUndefined(ft));
    }

    if (tagId && tagId !== null) {
      query = query
        .leftJoin({ ft: feedTag }, ({ feed, ft }) => eq(feed.id, ft.feedId))
        .where(({ ft }) => eq(ft?.tagId, tagId));
    }

    if (currentSort === "title_desc") {
      query = query.orderBy(({ feed }) => feed.title, "desc");
    } else {
      query = query.orderBy(({ feed }) => feed.title, "asc");
    }

    return query.select(({ feed }) => ({
      ...feed,
    }));
  });

  const allVisibleSelected = () => {
    const visibleFeeds = feedListQuery();
    if (visibleFeeds.length === 0) return false;
    return visibleFeeds.every((f) => selectedFeedIds().includes(f.id));
  };

  const isIndeterminate = () => {
    const visibleFeeds = feedListQuery();
    if (visibleFeeds.length === 0) return false;
    const selectedCount = visibleFeeds.filter((f) =>
      selectedFeedIds().includes(f.id),
    ).length;
    return selectedCount > 0 && selectedCount < visibleFeeds.length;
  };

  const toggleSelectAll = () => {
    const visibleFeeds = feedListQuery();
    if (allVisibleSelected()) {
      // Deselect all visible
      const visibleIds = visibleFeeds.map((f) => f.id);
      setSelectedFeedIds(
        selectedFeedIds().filter((id) => !visibleIds.includes(id)),
      );
    } else {
      // Select all visible
      const currentSelected = selectedFeedIds();
      const newSelected = [...currentSelected];
      for (const f of visibleFeeds) {
        if (!newSelected.includes(f.id)) {
          newSelected.push(f.id);
        }
      }
      setSelectedFeedIds(newSelected);
    }
  };

  const [deleteError, setDeleteError] = createSignal<Error | null>(null);

  const handleDelete = async (id: string) => {
    setDeleteError(null);
    try {
      await feedDelete(id);
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
          <div class={flex({ gap: "2", alignItems: "center", mr: "auto" })}>
            <input
              type="checkbox"
              id="select-all-visible"
              aria-label="Select all visible feeds"
              checked={allVisibleSelected()}
              ref={(el) => {
                createEffect(() => {
                  el.indeterminate = isIndeterminate();
                });
              }}
              onChange={() => toggleSelectAll()}
              class={css({ cursor: "pointer" })}
            />
          </div>
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
            <option value="all">All</option>
            <option value="untagged">Untagged</option>
            <For each={tagsQuery()}>
              {(tag) => (
                <option value={tag.id}>
                  {tag.name}
                  {tag.unreadCount && tag.unreadCount > 0n
                    ? ` (${formatUnreadCount(Number(tag.unreadCount))})`
                    : " (0)"}
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
        <Show when={feedListQuery.isLoading}>
          <p class={css({ color: "gray.500", fontSize: "sm" })}>Loading...</p>
        </Show>
        <Show when={deleteError()}>
          <p class={css({ color: "red.500" })}>
            Delete Error: {deleteError()?.message}
          </p>
        </Show>
        <Show when={!feedListQuery.isLoading && feedListQuery().length === 0}>
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
            <For each={feedListQuery()}>
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
                        <For each={feed.tags}>
                          {(tag) => <Badge>{tag.name}</Badge>}
                        </For>
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
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      onClickEvent={(e) => {
                        e.stopPropagation();
                        refreshMutation.mutate([feed.id]);
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

      <BulkActionBar
        selectedCount={selectedFeedIds().length}
        unit="feeds"
        onClear={() => setSelectedFeedIds([])}
        onExport={() => exportFeeds(selectedFeedIds())}
      >
        <ActionButton
          size="sm"
          variant="secondary"
          onClick={() => refreshMutation.mutate(selectedFeedIds())}
          disabled={refreshMutation.isPending}
        >
          {refreshMutation.isPending ? "Fetching..." : "Fetch Selected"}
        </ActionButton>
        <ActionButton
          size="sm"
          variant="primary"
          onClick={() => setIsManageModalOpen(true)}
        >
          Manage Tags
        </ActionButton>
      </BulkActionBar>
    </div>
  );
}

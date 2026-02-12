import { createFileRoute, Outlet } from "@tanstack/solid-router";
import { onCleanup, onMount } from "solid-js";
import { css } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { ItemList } from "../components/ItemList";
import { ActionButton } from "../components/ui/ActionButton";
import { PageLayout } from "../components/ui/PageLayout";
import { items, lastFetched } from "../lib/item-db";
import type { DateFilterValue } from "../lib/item-utils";

interface ItemsSearch {
  tagId?: string;
  since?: DateFilterValue;
}

export const Route = createFileRoute("/_items")({
  validateSearch: (search: Record<string, unknown>): ItemsSearch => {
    const since = search.since as DateFilterValue | undefined;
    const tagId = search.tagId as string | undefined;
    return {
      tagId,
      since: since ?? (tagId ? undefined : "30d"),
    };
  },
  component: ItemsLayout,
});

function ItemsLayout() {
  const search = Route.useSearch();
  const itemsCollection = items();

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // 'r' key to refresh items
      if (e.key === "r" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        itemsCollection.utils.refetch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
  });

  return (
    <PageLayout>
      <div
        class={css({
          flex: "1",
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        })}
      >
        <ItemList
          tagId={search()?.tagId}
          dateFilter={search()?.since}
          fixedControls
          headerActions={
            <div class={flex({ gap: "2", alignItems: "center" })}>
              {lastFetched() && (
                <span class={css({ fontSize: "sm", color: "gray.500" })}>
                  {lastFetched()?.toLocaleTimeString()}
                </span>
              )}
              <ActionButton
                size="sm"
                variant="secondary"
                onClick={() => itemsCollection.utils.refetch()}
                disabled={
                  (itemsCollection as unknown as { isFetching: boolean })
                    .isFetching
                }
              >
                {(itemsCollection as unknown as { isFetching: boolean })
                  .isFetching
                  ? "Refreshing..."
                  : "Refresh"}
              </ActionButton>
            </div>
          }
        />
        <Outlet />
      </div>
    </PageLayout>
  );
}

import { createFileRoute, Outlet } from "@tanstack/solid-router";
import { css } from "../../styled-system/css";
import { ItemList } from "../components/ItemList";
import { PageHeader } from "../components/ui/PageHeader";
import { PageLayout } from "../components/ui/PageLayout";
import type { DateFilterValue } from "../lib/item-utils";

interface ItemsSearch {
  tagId?: string;
  publishedSince?: DateFilterValue;
}

export const Route = createFileRoute("/_items")({
  validateSearch: (search: Record<string, unknown>): ItemsSearch => {
    const publishedSince = search.publishedSince as DateFilterValue | undefined;
    const tagId = search.tagId as string | undefined;
    return {
      tagId,
      publishedSince: publishedSince ?? (tagId ? undefined : "30d"),
    };
  },
  component: ItemsLayout,
});

function ItemsLayout() {
  const search = Route.useSearch();

  return (
    <PageLayout>
      <PageHeader title="All Items" />
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
          dateFilter={search()?.publishedSince}
          fixedControls
        />
        <Outlet />
      </div>
    </PageLayout>
  );
}

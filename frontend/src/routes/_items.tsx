import { createFileRoute, Outlet } from "@tanstack/solid-router";
import { ItemList } from "../components/ItemList";

interface ItemsSearch {
  tagId?: string;
}

export const Route = createFileRoute("/_items")({
  validateSearch: (search: Record<string, unknown>): ItemsSearch => {
    return {
      tagId: search.tagId as string | undefined,
    };
  },
  component: ItemsLayout,
});

function ItemsLayout() {
  const search = Route.useSearch();

  return (
    <div class="p-2">
      <h2 class="text-xl font-bold mb-4">All Items</h2>
      <ItemList tagId={search().tagId} />
      <Outlet />
    </div>
  );
}

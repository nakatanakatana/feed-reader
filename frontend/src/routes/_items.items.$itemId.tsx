import { createFileRoute } from "@tanstack/solid-router";
import { ItemDetailRouteView } from "../components/ItemDetailRouteView";

export const Route = createFileRoute("/_items/items/$itemId")({
  component: ItemDetailRoute,
});

function ItemDetailRoute() {
  const params = Route.useParams();
  const search = Route.useSearch();

  return (
    <ItemDetailRouteView
      itemId={params().itemId}
      tagId={search().tagId}
      basePath=""
    />
  );
}

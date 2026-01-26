import { createFileRoute } from "@tanstack/solid-router";
import { ItemDetailRouteView } from "../components/ItemDetailRouteView";

export const Route = createFileRoute("/feeds/$feedId/items/$itemId")({
  component: ItemDetailRoute,
});

function ItemDetailRoute() {
  const params = Route.useParams();

  return (
    <ItemDetailRouteView itemId={params().itemId} feedId={params().feedId} />
  );
}

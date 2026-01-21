import { createFileRoute } from "@tanstack/solid-router";
import { ItemList } from "../components/ItemList";
import { css } from "../../styled-system/css";
import { stack } from "../../styled-system/patterns";

export const Route = createFileRoute("/feeds/$feedId")({
  component: FeedItemsComponent,
});

function FeedItemsComponent() {
  const { feedId } = Route.useParams();

  return (
    <div class={stack({ padding: "4", gap: "4" })}>
      <h2 class={css({ fontSize: "xl", fontWeight: "bold" })}>Feed Items</h2>
      <ItemList feedId={feedId} />
    </div>
  );
}

import { createFileRoute } from "@tanstack/solid-router";
import { useLiveQuery } from "@tanstack/solid-db";
import { ItemList } from "../components/ItemList";
import { css } from "../../styled-system/css";
import { stack } from "../../styled-system/patterns";
import { feeds } from "../lib/db";

export const Route = createFileRoute("/feeds/$feedId")({
  component: FeedItemsComponent,
});

function FeedItemsComponent() {
  const params = Route.useParams();
  
  // Use find to ensure the collection syncs if needed
  const { data: feedsList } = useLiveQuery(() => 
    feeds.find({
      where: (f) => f.uuid === params().feedId
    })
  );
  
  const feedTitle = () => feedsList?.[0]?.title || "Feed Items";
  
  return (
    <div class={stack({ padding: "4", gap: "4" })}>
      <h2 class={css({ fontSize: "xl", fontWeight: "bold" })}>{feedTitle()}</h2>
      <ItemList feedId={params().feedId} />
    </div>
  );
}

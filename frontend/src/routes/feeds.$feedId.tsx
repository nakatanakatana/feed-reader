import { createFileRoute } from "@tanstack/solid-router";
import { useLiveQuery, eq } from "@tanstack/solid-db";
import { css } from "../../styled-system/css";
import { stack } from "../../styled-system/patterns";
import { feeds } from "../lib/db";

export const Route = createFileRoute("/feeds/$feedId")({
  component: FeedItemsComponent,
});

function FeedItemsComponent() {
  const params = Route.useParams();

  // Use useLiveQuery with query builder
  const { data: feedsList } = useLiveQuery((q) =>
    q
      .from({ feed: feeds })
      .where(({ feed }) => eq(feed.uuid, params().feedId))
      .select(({ feed }) => feed),
  );

  const feedTitle = () => feedsList?.[0]?.title || "Feed Items";

  return (
    <div class={stack({ padding: "4", gap: "4" })}>
      <h2 class={css({ fontSize: "xl", fontWeight: "bold" })}>{feedTitle()}</h2>
    </div>
  );
}

import { createFileRoute } from "@tanstack/solid-router";
import { Show } from "solid-js";
import { css } from "../../styled-system/css";
import { stack } from "../../styled-system/patterns";
import { AddFeedForm } from "../components/AddFeedForm";
import { FeedList } from "../components/FeedList";
import { FeedTimeline } from "../components/FeedTimeline";

type FeedsSearch = {
  feedId?: string;
  itemId?: string;
};

export const Route = createFileRoute("/feeds")({
  validateSearch: (search: Record<string, unknown>): FeedsSearch => {
    return {
      feedId: typeof search.feedId === "string" ? search.feedId : undefined,
      itemId: typeof search.itemId === "string" ? search.itemId : undefined,
    };
  },
  component: FeedsComponent,
});

function FeedsComponent() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const handleFeedSelect = (feedId: string | undefined) => {
    navigate({
      search: (prev) => ({ ...prev, feedId, itemId: undefined }),
    });
  };

  const handleItemSelect = (itemId: string | undefined) => {
    navigate({
      search: (prev) => ({ ...prev, itemId }),
    });
  };

  return (
    <div class={stack({ padding: "4", gap: "6" })}>
      <h1 class={css({ fontSize: "2xl", fontWeight: "bold" })}>
        Feed Management
      </h1>
      <AddFeedForm />
      <hr class={css({ borderColor: "gray.200" })} />
      <div
        class={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", lg: "300px 1fr" },
          gap: "8",
        })}
      >
        <FeedList selectedUuid={search.feedId} onSelect={handleFeedSelect} />
        <Show
          when={search.feedId}
          fallback={
            <p
              class={css({
                color: "gray.500",
                textAlign: "center",
                paddingTop: "10",
              })}
            >
              Select a feed to view articles
            </p>
          }
        >
          <FeedTimeline
            feedId={search.feedId}
            selectedItemId={search.itemId}
            onSelectItem={handleItemSelect}
          />
        </Show>
      </div>
    </div>
  );
}

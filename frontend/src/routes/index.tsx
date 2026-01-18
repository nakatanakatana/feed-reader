import { createFileRoute } from "@tanstack/solid-router";
import { css } from "../../styled-system/css";
import { stack } from "../../styled-system/patterns";
import { FeedTimeline } from "../components/FeedTimeline";

type HomeSearch = {
  itemId?: string;
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => {
    return {
      itemId: typeof search.itemId === "string" ? search.itemId : undefined,
    };
  },
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const handleItemSelect = (itemId: string | undefined) => {
    navigate({
      search: (prev) => ({ ...prev, itemId }),
    });
  };

  return (
    <div class={stack({ padding: "4", gap: "6" })}>
      <h1 class={css({ fontSize: "3xl", fontWeight: "bold" })}>
        Global Timeline
      </h1>
      <FeedTimeline
        selectedItemId={search.itemId}
        onSelectItem={handleItemSelect}
      />
    </div>
  );
}

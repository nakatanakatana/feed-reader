import { createFileRoute, Outlet } from "@tanstack/solid-router";
import { createSignal } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { AddFeedForm } from "../components/AddFeedForm";
import { FeedList } from "../components/FeedList";
import { ImportOpmlModal } from "../components/ImportOpmlModal";

export const Route = createFileRoute("/feeds")({
  component: FeedsComponent,
});

function FeedsComponent() {
  const [isImportModalOpen, setIsImportModalOpen] = createSignal(false);

  return (
    <div
      class={stack({
        padding: "4",
        gap: "6",
        height: "calc(100vh - 56px)",
        minHeight: 0,
        overflow: "hidden",
      })}
    >
      <div
        class={flex({ justifyContent: "space-between", alignItems: "center" })}
      >
        <h1 class={css({ fontSize: "2xl", fontWeight: "bold" })}>
          Feed Management
        </h1>
        <button
          type="button"
          onClick={() => setIsImportModalOpen(true)}
          class={css({
            fontSize: "sm",
            color: "blue.600",
            cursor: "pointer",
            _hover: { textDecoration: "underline" },
          })}
        >
          Import OPML
        </button>
      </div>
      <AddFeedForm />
      <hr class={css({ borderColor: "gray.200" })} />
      <div class={css({ flex: "1", minHeight: 0, display: "flex" })}>
        <FeedList />
      </div>
      <Outlet />
      <ImportOpmlModal
        isOpen={isImportModalOpen()}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}

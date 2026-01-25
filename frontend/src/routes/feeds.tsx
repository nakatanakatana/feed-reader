import { createFileRoute, Outlet } from "@tanstack/solid-router";
import { createSignal } from "solid-js";
import { css } from "../../styled-system/css";
import { stack, flex } from "../../styled-system/patterns";
import { AddFeedForm } from "../components/AddFeedForm";
import { FeedList } from "../components/FeedList";
import { ImportOpmlModal } from "../components/ImportOpmlModal";

export const Route = createFileRoute("/feeds")({
  component: FeedsComponent,
});

function FeedsComponent() {
  const [isImportModalOpen, setIsImportModalOpen] = createSignal(false);

  return (
    <div class={stack({ padding: "4", gap: "6" })}>
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
      <FeedList />
      <Outlet />
      <ImportOpmlModal
        isOpen={isImportModalOpen()}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}

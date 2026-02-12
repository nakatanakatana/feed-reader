import { createFileRoute, Outlet } from "@tanstack/solid-router";
import { createSignal } from "solid-js";
import { css } from "../../styled-system/css";
import { AddFeedForm } from "../components/AddFeedForm";
import { FeedList } from "../components/FeedList";
import { ImportOpmlModal } from "../components/ImportOpmlModal";
import { ActionButton } from "../components/ui/ActionButton";
import { PageLayout } from "../components/ui/PageLayout";

export const Route = createFileRoute("/feeds")({
  component: FeedsComponent,
});

function FeedsComponent() {
  const [isImportModalOpen, setIsImportModalOpen] = createSignal(false);

  return (
    <PageLayout>
      <AddFeedForm
        headerActions={
          <ActionButton
            variant="ghost"
            onClick={() => setIsImportModalOpen(true)}
          >
            Import OPML
          </ActionButton>
        }
      />
      <hr class={css({ borderColor: "gray.200" })} />
      <div class={css({ flex: "1", minHeight: 0, display: "flex" })}>
        <FeedList />
      </div>
      <Outlet />
      <ImportOpmlModal
        isOpen={isImportModalOpen()}
        onClose={() => setIsImportModalOpen(false)}
      />
    </PageLayout>
  );
}

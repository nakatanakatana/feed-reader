import { createFileRoute, Outlet } from "@tanstack/solid-router";
import { createSignal } from "solid-js";
import { css } from "../../styled-system/css";
import { stack } from "../../styled-system/patterns";
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

  const ImportIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );

  return (
    <PageLayout>
      <div class={stack({ gap: "2", flex: "1", minHeight: 0 })}>
        <AddFeedForm
          headerActions={
            <ActionButton
              variant="ghost"
              onClick={() => setIsImportModalOpen(true)}
              icon={<ImportIcon />}
              hideTextOnMobile
            >
              Import OPML
            </ActionButton>
          }
        />
        <div class={css({ flex: "1", minHeight: 0, display: "flex" })}>
          <FeedList />
        </div>
      </div>
      <Outlet />
      <ImportOpmlModal
        isOpen={isImportModalOpen()}
        onClose={() => setIsImportModalOpen(false)}
      />
    </PageLayout>
  );
}

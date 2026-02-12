import { createFileRoute } from "@tanstack/solid-router";
import { css } from "../../styled-system/css";
import { TagManagement } from "../components/TagManagement";
import { PageHeader } from "../components/ui/PageHeader";
import { PageLayout } from "../components/ui/PageLayout";

export const Route = createFileRoute("/tags")({
  component: TagsComponent,
});

function TagsComponent() {
  return (
    <PageLayout>
      <div class={css({ flex: "1", minHeight: 0, overflow: "auto" })}>
        <TagManagement />
      </div>
    </PageLayout>
  );
}

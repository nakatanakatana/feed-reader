import { createFileRoute } from "@tanstack/solid-router";
import { PageLayout } from "../components/ui/PageLayout";

export const Route = createFileRoute("/block-rules")({
  component: BlockRulesComponent,
});

function BlockRulesComponent() {
  return (
    <PageLayout>
      <div>Block Rules Page (Placeholder)</div>
    </PageLayout>
  );
}

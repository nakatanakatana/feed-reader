import { createFileRoute } from "@tanstack/solid-router";
import { PageLayout } from "../components/ui/PageLayout";

export const Route = createFileRoute("/url-rules")({
  component: URLRulesComponent,
});

function URLRulesComponent() {
  return (
    <PageLayout>
      <div>URL Rules Page (Placeholder)</div>
    </PageLayout>
  );
}

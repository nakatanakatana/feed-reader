import { createFileRoute } from "@tanstack/solid-router";
import { css } from "../../styled-system/css";
import { stack } from "../../styled-system/patterns";
import { TagManagement } from "../components/TagManagement";

export const Route = createFileRoute("/tags")({
  component: TagsComponent,
});

function TagsComponent() {
  return (
    <div class={stack({ padding: "4", gap: "6" })}>
      <h1 class={css({ fontSize: "2xl", fontWeight: "bold" })}>
        Tag Management
      </h1>
      <TagManagement />
    </div>
  );
}

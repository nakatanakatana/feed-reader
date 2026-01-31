import { createFileRoute } from "@tanstack/solid-router";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { TagManagement } from "../components/TagManagement";

export const Route = createFileRoute("/tags")({
  component: TagsComponent,
});

function TagsComponent() {
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
          Tag Management
        </h1>
      </div>
      <div class={css({ flex: "1", minHeight: 0, overflow: "auto" })}>
        <TagManagement />
      </div>
    </div>
  );
}

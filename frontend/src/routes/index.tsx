import { createFileRoute } from "@tanstack/solid-router";
import { css } from "../../styled-system/css";
import { stack } from "../../styled-system/patterns";
import { FeedTimeline } from "../components/FeedTimeline";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div class={stack({ padding: "4", gap: "6" })}>
      <h1 class={css({ fontSize: "3xl", fontWeight: "bold" })}>
        Global Timeline
      </h1>
      <FeedTimeline />
    </div>
  );
}

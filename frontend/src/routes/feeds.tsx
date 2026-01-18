import { createFileRoute } from "@tanstack/solid-router";
import { createSignal } from "solid-js";
import { css } from "../../styled-system/css";
import { stack } from "../../styled-system/patterns";
import { AddFeedForm } from "../components/AddFeedForm";
import { FeedList } from "../components/FeedList";
import { FeedTimeline } from "../components/FeedTimeline";

export const Route = createFileRoute("/feeds")({
	component: FeedsComponent,
});

function FeedsComponent() {
	const [selectedFeedId, setSelectedFeedId] = createSignal<
		string | undefined
	>();

	return (
		<div class={stack({ padding: "4", gap: "6" })}>
			<h1 class={css({ fontSize: "2xl", fontWeight: "bold" })}>
				Feed Management
			</h1>
			<AddFeedForm />
			<hr class={css({ borderColor: "gray.200" })} />
			<div
				class={css({
					display: "grid",
					gridTemplateColumns: { base: "1fr", lg: "300px 1fr" },
					gap: "8",
				})}
			>
				<FeedList
					selectedUuid={selectedFeedId()}
					onSelect={setSelectedFeedId}
				/>
				<FeedTimeline feedId={selectedFeedId()} />
			</div>
		</div>
	);
}
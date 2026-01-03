import { createFileRoute } from "@tanstack/solid-router";
import { css } from "../../styled-system/css";
import { stack } from "../../styled-system/patterns";
import { AddFeedForm } from "../components/AddFeedForm";
import { FeedList } from "../components/FeedList";

export const Route = createFileRoute("/feeds")({
	component: FeedsComponent,
});

function FeedsComponent() {
	return (
		<div class={stack({ padding: "4", gap: "6" })}>
			<h1 class={css({ fontSize: "2xl", fontWeight: "bold" })}>
				Feed Management
			</h1>
			<AddFeedForm />
			<hr class={css({ borderColor: "gray.200" })} />
			<FeedList />
		</div>
	);
}

import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { FeedService } from "../gen/feed/v1/feed_connect";
import { GetItemResponse } from "../gen/feed/v1/feed_pb";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { mockConnectWeb } from "../mocks/connect";
import { ItemDetail } from "./ItemDetail";

describe("ItemDetail", () => {
	let dispose: () => void;

	afterEach(() => {
		if (dispose) dispose();
		document.body.innerHTML = "";
	});

	const transport = createConnectTransport({
		baseUrl: "http://localhost:3000",
	});

	it("renders full content from API", async () => {
		worker.use(
			mockConnectWeb(FeedService)({
				method: "getItem",
				handler: () => {
					return new GetItemResponse({
						item: {
							id: "1",
							title: "Detailed Item",
							content: "<p>Full content from API</p>",
							url: "http://example.com",
							publishedAt: "2026-01-18T10:00:00Z",
						},
					});
				},
			}),
		);

		const queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
			},
		});

		dispose = render(
			() => (
				<TransportProvider transport={transport}>
					<QueryClientProvider client={queryClient}>
						<ItemDetail itemId="1" onClose={() => {}} />
					</QueryClientProvider>
				</TransportProvider>
			),
			document.body,
		);

		await expect.element(page.getByText("Detailed Item")).toBeInTheDocument();
		await expect
			.element(page.getByText("Full content from API"))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole("link", { name: "Original Article" }))
			.toBeInTheDocument();
	});

	it("calls onClose when Close button clicked", async () => {
		const onClose = vi.fn();
		// Mock needed even for onClose if it tries to fetch immediately
		worker.use(
			mockConnectWeb(FeedService)({
				method: "getItem",
				handler: () => new GetItemResponse({ item: { id: "1" } }),
			}),
		);

		const queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
			},
		});

		dispose = render(
			() => (
				<TransportProvider transport={transport}>
					<QueryClientProvider client={queryClient}>
						<ItemDetail itemId="1" onClose={onClose} />
					</QueryClientProvider>
				</TransportProvider>
			),
			document.body,
		);

		const closeButton = page.getByText("Close");
		await closeButton.click();
		expect(onClose).toHaveBeenCalled();
	});
});
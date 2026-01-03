import { HttpResponse, http } from "msw";

const feeds = [
	{
		uuid: "1",
		url: "https://example.com/feed1.xml",
		title: "Example Feed 1",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		uuid: "2",
		url: "https://example.com/feed2.xml",
		title: "Example Feed 2",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
];

export const handlers = [
	http.post("*/feed.v1.FeedService/ListFeeds", () => {
		return HttpResponse.json({
			feeds: feeds,
		});
	}),

	http.post("*/feed.v1.FeedService/CreateFeed", async ({ request }) => {
		const body = (await request.json()) as any;
		const newFeed = {
			uuid: crypto.randomUUID(),
			url: body.url,
			title: body.title || "New Feed",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		// In-memory update for the session
		feeds.push(newFeed);
		return HttpResponse.json({
			feed: newFeed,
		});
	}),

	http.post("*/feed.v1.FeedService/DeleteFeed", async ({ request }) => {
		const body = (await request.json()) as any;
		const index = feeds.findIndex((f) => f.uuid === body.uuid);
		if (index !== -1) {
			feeds.splice(index, 1);
		}
		return HttpResponse.json({});
	}),
];

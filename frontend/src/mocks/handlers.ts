import { HttpResponse, http } from "msw";

type TagJSON = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  unreadCount: string;
  feedCount: string;
};

type FeedJSON = {
  id: string;
  url: string;
  link?: string;
  title: string;
  lastFetchedAt?: string;
  nextFetchAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: TagJSON[];
  unreadCount: string;
};

type ItemJSON = {
  id: string;
  url?: string;
  title: string;
  description?: string;
  publishedAt: string;
  feedId?: string;
  isRead: boolean;
  author?: string;
  content?: string;
  imageUrl?: string;
  categories?: string[];
  createdAt: string;
};

type ItemReadJSON = {
  itemId: string;
  isRead: boolean;
  updatedAt: string;
};

type URLRuleJSON = {
  id: string;
  domain: string;
  ruleType: string;
  pattern: string;
};

type BlockRuleJSON = {
  id: string;
  ruleType: string;
  value: string;
  domain?: string;
};

const tags: TagJSON[] = [];
const feeds: FeedJSON[] = [];
const items: ItemJSON[] = [];
const itemReads = new Map<string, { isRead: boolean; updatedAt: Date }>();
const urlRules: URLRuleJSON[] = [];
const blockRules: BlockRuleJSON[] = [];

const iso = (date: Date | string) =>
  typeof date === "string" ? date : date.toISOString();

const recalculateFeedCounts = () => {
  for (const tag of tags) {
    tag.feedCount = feeds
      .filter((feed) => feed.tags.some((feedTag) => feedTag.id === tag.id))
      .length.toString();
  }
};

const findOrUnknownTag = (id: string): TagJSON =>
  tags.find((tag) => tag.id === id) ?? {
    id,
    name: "Unknown",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    unreadCount: "0",
    feedCount: "0",
  };

export const resetState = () => {
  console.log("MSW: resetState called");
  tags.length = 0;
  feeds.length = 0;
  items.length = 0;
  urlRules.length = 0;
  blockRules.length = 0;
  itemReads.clear();

  const now = "2026-03-01T00:00:00.000Z";

  tags.push(
    {
      id: "tag-1",
      name: "Tech",
      createdAt: now,
      updatedAt: now,
      unreadCount: "5",
      feedCount: "1",
    },
    {
      id: "tag-2",
      name: "News",
      createdAt: now,
      updatedAt: now,
      unreadCount: "3",
      feedCount: "2",
    },
  );

  feeds.push(
    {
      id: "1",
      url: "https://example.com/feed1.xml",
      link: "https://example.com/",
      title: "Example Feed 1",
      lastFetchedAt: now,
      createdAt: now,
      updatedAt: now,
      tags: [tags[0]],
      unreadCount: "0",
    },
    {
      id: "2",
      url: "https://example.com/feed2.xml",
      link: "https://example.com/news",
      title: "Example Feed 2",
      lastFetchedAt: now,
      createdAt: now,
      updatedAt: now,
      tags: [tags[1]],
      unreadCount: "0",
    },
  );

  const base = new Date(now);
  for (let i = 0; i < 40; i++) {
    const id = (i + 1).toString();
    const date = new Date(base);
    if (i < 10) date.setHours(date.getHours() - i);
    else if (i < 20) date.setDate(date.getDate() - 2);
    else if (i < 30) date.setDate(date.getDate() - 10);
    else date.setDate(date.getDate() - 40);

    items.push({
      id,
      title: `Item ${id}`,
      publishedAt: iso(date),
      createdAt: iso(date),
      isRead: false,
      description: `<p>Full content for item ${id}</p>`,
      author: "Mock Author",
      url: `https://example.com/item${id}`,
    });
  }
};

// Initial state
resetState();

const listFeedTags = () =>
  feeds.flatMap((feed) =>
    feed.tags.map((tag) => ({
      feedId: feed.id,
      tagId: tag.id,
    })),
  );

export const handlers = [
  http.get("*/api/v2/tags", () => {
    return HttpResponse.json({
      tags,
      totalUnreadCount: tags
        .reduce((total, tag) => total + BigInt(tag.unreadCount), 0n)
        .toString(),
    });
  }),

  http.post("*/api/v2/tags", async ({ request }) => {
    const body = (await request.json()) as { name: string };
    const now = "2026-03-01T00:00:00.000Z";
    const tag: TagJSON = {
      id: crypto.randomUUID(),
      name: body.name,
      createdAt: now,
      updatedAt: now,
      unreadCount: "0",
      feedCount: "0",
    };
    tags.push(tag);
    return HttpResponse.json({ tag });
  }),

  http.delete("*/api/v2/tags/:id", ({ params }) => {
    const id = String(params.id);
    const index = tags.findIndex((tag) => tag.id === id);
    if (index !== -1) {
      tags.splice(index, 1);
      for (const feed of feeds) {
        feed.tags = feed.tags.filter((tag) => tag.id !== id);
      }
      recalculateFeedCounts();
    }
    return HttpResponse.json({});
  }),

  http.get("*/api/v2/feeds", ({ request }) => {
    const url = new URL(request.url);
    const tagId = url.searchParams.get("tagId");
    const filteredFeeds = tagId
      ? feeds.filter((feed) => feed.tags.some((tag) => tag.id === tagId))
      : feeds;

    return HttpResponse.json({ feeds: filteredFeeds });
  }),

  http.post("*/api/v2/feeds", async ({ request }) => {
    const body = (await request.json()) as {
      url: string;
      title?: string;
      tagIds?: string[];
    };
    const now = "2026-03-01T00:00:00.000Z";
    const feed: FeedJSON = {
      id: crypto.randomUUID(),
      url: body.url,
      title: body.title || "New Feed",
      createdAt: now,
      updatedAt: now,
      tags: (body.tagIds || []).map(findOrUnknownTag),
      unreadCount: "0",
    };
    feeds.push(feed);
    recalculateFeedCounts();
    return HttpResponse.json({ feed });
  }),

  http.delete("*/api/v2/feeds/:id", ({ params }) => {
    const id = String(params.id);
    const index = feeds.findIndex((feed) => feed.id === id);
    if (index !== -1) {
      feeds.splice(index, 1);
      recalculateFeedCounts();
    }

    return HttpResponse.json({});
  }),

  http.post("*/api/v2/feeds/refresh", async ({ request }) => {
    const body = (await request.json()) as { ids?: string[] };

    return HttpResponse.json({
      results: (body.ids || []).map((id) => ({
        feedId: id,
        success: true,
        newItemsCount: 0,
      })),
    });
  }),

  http.post("*/api/v2/feeds/import-opml", () => {
    return HttpResponse.json({
      total: 0,
      success: 0,
      skipped: 0,
      failedFeeds: [],
    });
  }),

  http.post("*/api/v2/feeds/export-opml", () => {
    const opml = `<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><body>${feeds
      .map((feed) => `<outline text="${feed.title}" xmlUrl="${feed.url}" />`)
      .join("")}</body></opml>`;
    return HttpResponse.json({ opmlContent: btoa(opml) });
  }),

  http.post("*/api/v2/feeds/suspend", async ({ request }) => {
    const body = (await request.json()) as {
      ids?: string[];
      suspendSeconds?: string;
    };
    const nextFetchAt = new Date(
      Date.now() + Number(body.suspendSeconds || "0") * 1000,
    ).toISOString();
    for (const id of body.ids || []) {
      const feed = feeds.find((candidate) => candidate.id === id);
      if (feed) feed.nextFetchAt = nextFetchAt;
    }
    return HttpResponse.json({});
  }),

  http.get("*/api/v2/feed-tags", ({ request }) => {
    const url = new URL(request.url);
    const feedId = url.searchParams.get("feedId");
    const tagId = url.searchParams.get("tagId");
    const feedTags = listFeedTags().filter(
      (feedTag) =>
        (feedId === null || feedTag.feedId === feedId) &&
        (tagId === null || feedTag.tagId === tagId),
    );

    return HttpResponse.json({ feedTags });
  }),

  http.post("*/api/v2/feed-tags/manage", async ({ request }) => {
    const body = (await request.json()) as {
      feedIds?: string[];
      addTagIds?: string[];
      removeTagIds?: string[];
    };
    const addTagIds = body.addTagIds || [];
    const removeTagIds = body.removeTagIds || [];
    for (const feedId of body.feedIds || []) {
      const feed = feeds.find((candidate) => candidate.id === feedId);
      if (!feed) continue;
      feed.tags = feed.tags.filter((tag) => !removeTagIds.includes(tag.id));
      for (const tagId of addTagIds) {
        if (!feed.tags.some((tag) => tag.id === tagId)) {
          feed.tags.push(findOrUnknownTag(tagId));
        }
      }
    }
    recalculateFeedCounts();
    return HttpResponse.json({});
  }),

  http.get("*/api/v2/items", ({ request }) => {
    const url = new URL(request.url);
    const parsedPageToken = url.searchParams.get("pageToken")
      ? Number.parseInt(url.searchParams.get("pageToken") ?? "0", 10)
      : 0;
    const start = Number.isNaN(parsedPageToken) ? 0 : parsedPageToken;
    const pageSize = Number.parseInt(
      url.searchParams.get("pageSize") ?? "100",
      10,
    );
    const isRead = url.searchParams.get("isRead");
    const filteredItems =
      isRead === null
        ? items
        : items.filter((item) => item.isRead === (isRead === "true"));
    const paginatedItems = filteredItems.slice(start, start + pageSize);
    const nextPageToken =
      filteredItems.length > start + pageSize
        ? (start + pageSize).toString()
        : "";

    return HttpResponse.json({
      items: paginatedItems,
      nextPageToken,
    });
  }),

  http.get("*/api/v2/items/:id", ({ params }) => {
    const id = String(params.id);
    const item = items.find((candidate) => candidate.id === id);
    if (item) return HttpResponse.json({ item });

    const now = "2026-03-01T00:00:00.000Z";
    return HttpResponse.json({
      item: {
        id,
        title: `Item ${id}`,
        publishedAt: now,
        createdAt: now,
        isRead: false,
        description: `<p>Full content for item ${id}</p>`,
        author: "Mock Author",
        url: `https://example.com/item${id}`,
      },
    });
  }),

  http.post("*/api/v2/items/status", async ({ request }) => {
    const body = (await request.json()) as {
      ids?: string[];
      isRead?: boolean;
    };
    const updatedAt = new Date("2026-03-01T00:00:00Z");
    for (const id of body.ids || []) {
      const item = items.find((candidate) => candidate.id === id);
      if (item && body.isRead !== undefined) item.isRead = body.isRead;
      if (body.isRead !== undefined) {
        itemReads.set(id, { isRead: body.isRead, updatedAt });
      }
    }

    return HttpResponse.json({});
  }),

  http.get("*/api/v2/item-reads", ({ request }) => {
    const url = new URL(request.url);
    const since = url.searchParams.get("since");
    const pageToken = url.searchParams.get("pageToken");
    const pageSize = Number.parseInt(
      url.searchParams.get("pageSize") ?? "1000",
      10,
    );
    const start = pageToken ? Number.parseInt(pageToken, 10) : 0;

    let results: ItemReadJSON[] = Array.from(itemReads.entries()).map(
      ([itemId, state]) => ({
        itemId,
        isRead: state.isRead,
        updatedAt: state.updatedAt.toISOString(),
      }),
    );

    results.sort((a, b) => {
      const timeDiff =
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return timeDiff === 0 ? a.itemId.localeCompare(b.itemId) : timeDiff;
    });

    if (pageToken) {
      results = results.slice(Number.isNaN(start) ? 0 : start);
    } else if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        results = results.filter(
          (itemRead) => new Date(itemRead.updatedAt) > sinceDate,
        );
      }
    }

    const paginatedResults = results.slice(0, pageSize);
    const nextPageToken =
      results.length > pageSize
        ? ((Number.isNaN(start) ? 0 : start) + pageSize).toString()
        : "";

    return HttpResponse.json({
      itemReads: paginatedResults,
      nextPageToken,
    });
  }),

  http.get("*/api/v2/url-rules", () => {
    return HttpResponse.json({ rules: urlRules });
  }),

  http.post("*/api/v2/url-rules", async ({ request }) => {
    const body = (await request.json()) as {
      domain: string;
      ruleType: string;
      pattern: string;
    };
    if (body.ruleType !== "subdomain" && body.ruleType !== "path") {
      return HttpResponse.json({ error: "invalid ruleType" }, { status: 400 });
    }
    const rule: URLRuleJSON = {
      id: Math.random().toString(36).substring(7),
      domain: body.domain,
      ruleType: body.ruleType,
      pattern: body.pattern,
    };
    urlRules.push(rule);
    return HttpResponse.json({ rule });
  }),

  http.delete("*/api/v2/url-rules/:id", ({ params }) => {
    const id = String(params.id);
    const index = urlRules.findIndex((rule) => rule.id === id);
    if (index !== -1) urlRules.splice(index, 1);
    return HttpResponse.json({});
  }),

  http.get("*/api/v2/block-rules", () => {
    return HttpResponse.json({ rules: blockRules });
  }),

  http.post("*/api/v2/block-rules", async ({ request }) => {
    const body = (await request.json()) as {
      rules?: Array<{ ruleType: string; value: string; domain?: string }>;
    };
    for (const [i, rule] of (body.rules || []).entries()) {
      if (
        !["user", "domain", "user_domain", "keyword"].includes(rule.ruleType)
      ) {
        return HttpResponse.json(
          { error: `invalid ruleType at index ${i}` },
          { status: 400 },
        );
      }
    }
    for (const rule of body.rules || []) {
      blockRules.push({
        id: Math.random().toString(36).substring(7),
        ruleType: rule.ruleType,
        value: rule.value,
        domain: rule.domain,
      });
    }
    return HttpResponse.json({});
  }),

  http.delete("*/api/v2/block-rules/:id", ({ params }) => {
    const id = String(params.id);
    const index = blockRules.findIndex((rule) => rule.id === id);
    if (index !== -1) blockRules.splice(index, 1);
    return HttpResponse.json({});
  }),
];

import { describe, expect, it } from "vitest";
import { resetState } from "./handlers";

const apiFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`http://localhost/api/v2${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  expect(response.ok).toBe(true);
  return (await response.json()) as T;
};

describe("JSON API mock handlers", () => {
  it("mocks ListFeeds", async () => {
    const response = await apiFetch<{ feeds: Array<{ id: string }> }>("/feeds");

    expect(response).toHaveProperty("feeds");
    expect(Array.isArray(response.feeds)).toBe(true);
    expect(response.feeds.length).toBe(2);
  });

  it("mocks CreateFeed", async () => {
    const feedData = {
      url: "https://example.com/new-feed.xml",
      title: "New Example Feed",
    };

    const response = await apiFetch<{ feed: { url: string } }>("/feeds", {
      method: "POST",
      body: JSON.stringify(feedData),
    });

    expect(response.feed.url).toBe(feedData.url);

    const listResponse = await apiFetch<{ feeds: Array<{ id: string }> }>(
      "/feeds",
    );
    expect(listResponse.feeds.length).toBe(3);
  });

  it("has reset state after the previous test", async () => {
    const response = await apiFetch<{ feeds: Array<{ id: string }> }>("/feeds");
    expect(response.feeds.length).toBe(2);
  });

  it("manually resets state", async () => {
    await apiFetch("/feeds", {
      method: "POST",
      body: JSON.stringify({ url: "https://test.com" }),
    });
    let list = await apiFetch<{ feeds: Array<{ id: string }> }>("/feeds");
    expect(list.feeds.length).toBe(3);

    resetState();
    list = await apiFetch<{ feeds: Array<{ id: string }> }>("/feeds");
    expect(list.feeds.length).toBe(2);
  });

  it("mocks DeleteFeed", async () => {
    const listResponse = await apiFetch<{ feeds: Array<{ id: string }> }>(
      "/feeds",
    );
    const idToDelete = listResponse.feeds[0].id;

    await apiFetch(`/feeds/${idToDelete}`, { method: "DELETE" });

    const listResponseAfter = await apiFetch<{
      feeds: Array<{ id: string }>;
    }>("/feeds");
    expect(
      listResponseAfter.feeds.find((feed) => feed.id === idToDelete),
    ).toBeUndefined();
    expect(listResponseAfter.feeds.length).toBe(1);
  });
});

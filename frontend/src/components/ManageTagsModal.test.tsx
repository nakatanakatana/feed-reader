import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient } from "../lib/query";
import { worker } from "../mocks/browser";
import {
  create,
  ListFeedTagsResponseSchema,
  ListTagsResponseSchema,
  TagSchema,
  toJson,
} from "../test-utils/json-identity";
import { ManageTagsModal } from "./ManageTagsModal";

describe("ManageTagsModal", () => {
  let dispose: () => void;
  const now = "2026-03-01T00:00:00.000Z";

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders the modal with tags", async () => {
    worker.use(
      http.all("*/api/v2/tags", () => {
        const msg = create(ListTagsResponseSchema, {
          tags: [
            create(TagSchema, {
              id: "t1",
              name: "Tech",
              createdAt: now,
              updatedAt: now,
              unreadCount: 0n,
              feedCount: 1n,
            }),
            create(TagSchema, {
              id: "t2",
              name: "News",
              createdAt: now,
              updatedAt: now,
              unreadCount: 0n,
              feedCount: 2n,
            }),
          ],
        });
        return HttpResponse.json(toJson(ListTagsResponseSchema, msg));
      }),
      http.all("*/api/v2/feed-tags", () => {
        return HttpResponse.json(
          toJson(
            ListFeedTagsResponseSchema,
            create(ListFeedTagsResponseSchema, { feedTags: [] }),
          ),
        );
      }),
    );

    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <ManageTagsModal
            isOpen={true}
            onClose={() => {}}
            feedIds={["f1", "f2"]}
          />
        </QueryClientProvider>
      ),
      document.body,
    );

    // Should show title with count
    await expect
      .element(page.getByText("Manage Tags for 2 feeds"))
      .toBeInTheDocument();

    // Should show tags
    await expect.element(page.getByText("Tech")).toBeInTheDocument();
    await expect.element(page.getByText("News")).toBeInTheDocument();
  });
});

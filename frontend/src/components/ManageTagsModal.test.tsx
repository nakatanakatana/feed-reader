import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { ListFeedTagsResponseSchema } from "../gen/feed/v1/feed_pb";
import { ListTagSchema, ListTagsResponseSchema } from "../gen/tag/v1/tag_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { ManageTagsModal } from "./ManageTagsModal";

describe("ManageTagsModal", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders the modal with tags", async () => {
    worker.use(
      http.all("*/tag.v1.TagService/ListTags", () => {
        const msg = create(ListTagsResponseSchema, {
          tags: [
            create(ListTagSchema, { id: "t1", name: "Tech", feedCount: 1n }),
            create(ListTagSchema, { id: "t2", name: "News", feedCount: 2n }),
          ],
        });
        return HttpResponse.json(toJson(ListTagsResponseSchema, msg));
      }),
      http.all("*/feed.v1.FeedService/ListFeedTags", () => {
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
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ManageTagsModal
              isOpen={true}
              onClose={() => {}}
              feedIds={["f1", "f2"]}
            />
          </QueryClientProvider>
        </TransportProvider>
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

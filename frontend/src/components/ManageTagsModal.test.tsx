import { create } from "@bufbuild/protobuf";
import { createRouterTransport } from "@connectrpc/connect";
import { QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import {
  ListTagSchema,
  ListTagsResponseSchema,
  TagService,
} from "../gen/tag/v1/tag_pb";
import { queryClient } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { ManageTagsModal } from "./ManageTagsModal";

describe("ManageTagsModal", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("renders the modal with tags", async () => {
    const transport = createRouterTransport(({ service }) => {
      service(TagService, {
        async listTags() {
          return create(ListTagsResponseSchema, {
            tags: [
              create(ListTagSchema, { id: "t1", name: "Tech", feedCount: 1n }),
              create(ListTagSchema, { id: "t2", name: "News", feedCount: 2n }),
            ],
          });
        },
      });
    });

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

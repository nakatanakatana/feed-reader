import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { ManageTagsModal } from "./ManageTagsModal";
import { TransportProvider } from "../lib/transport-context";
import { createRouterTransport } from "@connectrpc/connect";
import { TagService } from "../gen/tag/v1/tag_connect";
import { ListTagsResponse, Tag } from "../gen/tag/v1/tag_pb";
import { QueryClientProvider } from "@tanstack/solid-query";
import { queryClient } from "../lib/query";

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
          return new ListTagsResponse({
            tags: [
              new Tag({ id: "t1", name: "Tech" }),
              new Tag({ id: "t2", name: "News" }),
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

import { createRouterTransport } from "@connectrpc/connect";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { FeedService } from "../gen/feed/v1/feed_connect";
import { ImportOpmlResponse } from "../gen/feed/v1/feed_pb";
import { TransportProvider } from "../lib/transport-context";
import { ImportOpmlModal } from "./ImportOpmlModal";

describe("ImportOpmlModal", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("handles successful OPML import", async () => {
    const transport = createRouterTransport(({ service }) => {
      service(FeedService, {
        async importOpml() {
          return new ImportOpmlResponse({
            total: 10,
            success: 8,
            skipped: 2,
            failedFeeds: [],
          });
        },
      });
    });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <ImportOpmlModal isOpen={true} onClose={() => {}} />
        </TransportProvider>
      ),
      document.body,
    );

    // Initial state
    await expect
      .element(page.getByText("Select an .opml or .xml file"))
      .toBeInTheDocument();

    // Mock file upload
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["<opml><body></body></opml>"], "test.opml", {
      type: "text/xml",
    });

    // Use vitest-browser's fill or dispatch event
    // Since page.fill doesn't support files easily in this version of vitest/browser sometimes
    // we use a workaround
    Object.defineProperty(input, "files", {
      value: [file],
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));

    // Wait for result
    await expect
      .element(page.getByText("Import Completed!"))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Total feeds found: 10"))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Successfully imported: 8"))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Skipped (already exists): 2"))
      .toBeInTheDocument();
  });

  it("handles import error", async () => {
    const transport = createRouterTransport(({ service }) => {
      service(FeedService, {
        async importOpml() {
          throw new Error("Invalid OPML format");
        },
      });
    });

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <ImportOpmlModal isOpen={true} onClose={() => {}} />
        </TransportProvider>
      ),
      document.body,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["invalid"], "test.opml", { type: "text/xml" });

    Object.defineProperty(input, "files", {
      value: [file],
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));

    await expect
      .element(page.getByText(/Error: .*(Invalid OPML format|internal error)/))
      .toBeInTheDocument();
  });
});

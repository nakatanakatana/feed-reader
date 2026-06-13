import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { worker } from "../mocks/browser";
import { ImportOpmlModal } from "./ImportOpmlModal";

describe("ImportOpmlModal", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("handles successful OPML import", async () => {
    const importSpy = vi.fn();
    worker.use(
      http.post("*/api/v2/feeds/import-opml", async ({ request }) => {
        importSpy(await request.json());
        return HttpResponse.json({
          total: 10,
          success: 8,
          skipped: 2,
          failedFeeds: [],
        });
      }),
    );

    dispose = render(
      () => <ImportOpmlModal isOpen={true} onClose={() => {}} />,
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
    await expect.element(page.getByText("Import Summary")).toBeInTheDocument();
    await expect.element(page.getByText("Total: 10")).toBeInTheDocument();
    await expect.element(page.getByText("Success: 8")).toBeInTheDocument();
    await expect.element(page.getByText("Skipped: 2")).toBeInTheDocument();
    expect(importSpy).toHaveBeenCalledWith({
      opmlContent: "PG9wbWw+PGJvZHk+PC9ib2R5Pjwvb3BtbD4=",
    });
  });

  it("handles import error", async () => {
    worker.use(
      http.post("*/api/v2/feeds/import-opml", () =>
        HttpResponse.json(
          {
            code: "internal",
            message: "Invalid OPML format",
          },
          { status: 500 },
        ),
      ),
    );

    dispose = render(
      () => <ImportOpmlModal isOpen={true} onClose={() => {}} />,
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
      .element(page.getByText("Error: Invalid OPML format"))
      .toBeInTheDocument();
  });
});

import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { worker } from "../mocks/browser";
import { ImportOpmlModal } from "./ImportOpmlModal";

describe("ImportOpmlModal Error Handling", () => {
  let dispose: (() => void) | undefined;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders a list of failed feeds with error messages", async () => {
    worker.use(
      http.post("*/api/v2/feeds/import-opml", () =>
        HttpResponse.json({
          total: 3,
          success: 1,
          skipped: 0,
          failedFeeds: [
            {
              url: "https://example.com/fail1",
              errorMessage: "Invalid URL",
            },
            {
              url: "https://example.com/fail2",
              errorMessage: "Network timeout",
            },
          ],
        }),
      ),
    );

    dispose = render(
      () => <ImportOpmlModal isOpen={true} onClose={() => {}} />,
      document.body,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["mock content"], "test.opml", { type: "text/xml" });
    Object.defineProperty(input, "files", { value: [file] });
    input.dispatchEvent(new Event("change", { bubbles: true }));

    // Wait for result
    await expect.element(page.getByText("Import Summary")).toBeInTheDocument();

    // Check for error details
    await expect
      .element(page.getByText("https://example.com/fail1"))
      .toBeInTheDocument();
    await expect.element(page.getByText("Invalid URL")).toBeInTheDocument();
    await expect
      .element(page.getByText("https://example.com/fail2"))
      .toBeInTheDocument();
    await expect.element(page.getByText("Network timeout")).toBeInTheDocument();
  });
});

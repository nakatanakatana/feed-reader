import { QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { BulkImportBlockingRulesModal } from "./BulkImportBlockingRulesModal";
import { worker } from "../mocks/browser";
import { http, HttpResponse } from "msw";

describe("BulkImportBlockingRulesModal", () => {
  let dispose: () => void;
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    queryClient.clear();
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const TestWrapper = (props: { isOpen: boolean }) => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        <BulkImportBlockingRulesModal
          isOpen={props.isOpen}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </QueryClientProvider>
    </TransportProvider>
  );

  it("renders correctly when open", async () => {
    dispose = render(() => <TestWrapper isOpen={true} />, document.body);
    await expect.element(page.getByText("Bulk Import Blocking Rules")).toBeInTheDocument();
    await expect.element(page.getByPlaceholder(/user_domain,,spam.com/)).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    dispose = render(() => <TestWrapper isOpen={true} />, document.body);
    const cancelButton = page.getByRole("button", { name: /Cancel/i });
    await cancelButton.click();
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onSuccess and closes modal on successful import", async () => {
    dispose = render(() => <TestWrapper isOpen={true} />, document.body);
    
    const textarea = page.getByPlaceholder(/user_domain,,spam.com/);
    await textarea.fill("keyword,,,testrule");

    const importButton = page.getByRole("button", { name: /Import Rules/i });
    await expect.element(importButton).not.toBeDisabled();
    await importButton.click();

    // We rely on MSW to handle the request and return success
    // Wait for async operation to complete
    await vi.waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });
  });

  it("displays error message when import fails", async () => {
    dispose = render(() => <TestWrapper isOpen={true} />, document.body);
    
    const textarea = page.getByPlaceholder(/user_domain,,spam.com/);
    await textarea.fill("keyword,,,errorrule");

    // Override MSW to return error
    worker.use(
      http.post("*/blocking.v1.BlockingService/BulkCreateBlockingRules", () => {
        return new HttpResponse(JSON.stringify({ message: "Simulated error" }), { status: 500 });
      })
    );

    const importButton = page.getByRole("button", { name: /Import Rules/i });
    await importButton.click();

    await expect.element(page.getByText(/Error:/)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

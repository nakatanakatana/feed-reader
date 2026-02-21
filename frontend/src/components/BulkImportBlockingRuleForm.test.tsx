import { QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { BulkImportBlockingRuleForm } from "./BulkImportBlockingRuleForm";

// Mock the lib/blocking-db
vi.mock("../lib/blocking-db", () => ({
  bulkCreateBlockingRules: vi.fn(),
  parseBulkBlockingRules: vi.fn(() => []),
}));

describe("BulkImportBlockingRuleForm", () => {
  let dispose: () => void;

  beforeEach(() => {
    queryClient.clear();
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const TestWrapper = () => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        <BulkImportBlockingRuleForm />
      </QueryClientProvider>
    </TransportProvider>
  );

  it("renders correctly", async () => {
    dispose = render(() => <TestWrapper />, document.body);
    await expect.element(page.getByText("Bulk Import Blocking Rules")).toBeInTheDocument();
    await expect.element(page.getByPlaceholder(/user_domain,,spam.com/)).toBeInTheDocument();
  });

  it("disables import button when empty", async () => {
    dispose = render(() => <TestWrapper />, document.body);
    const button = page.getByRole("button", { name: /Import Rules/i });
    await expect.element(button).toBeDisabled();
  });
});

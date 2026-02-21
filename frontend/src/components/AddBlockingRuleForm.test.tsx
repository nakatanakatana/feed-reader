import { QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { AddBlockingRuleForm } from "./AddBlockingRuleForm";

// Mock the lib/blocking-db
vi.mock("../lib/blocking-db", () => ({
  createBlockingRule: vi.fn(),
}));

describe("AddBlockingRuleForm", () => {
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
        <AddBlockingRuleForm />
      </QueryClientProvider>
    </TransportProvider>
  );

  it("renders correctly", async () => {
    dispose = render(() => <TestWrapper />, document.body);
    await expect.element(page.getByText("Rule Type")).toBeInTheDocument();
    await expect.element(page.getByRole("button", { name: /Add Rule/i })).toBeInTheDocument();
  });

  it("toggles fields based on rule type", async () => {
    dispose = render(() => <TestWrapper />, document.body);
    
    // Default is user_domain
    await expect.element(page.getByPlaceholder("spammer")).toBeInTheDocument();
    
    const typeSelect = page.getByLabelText("Rule Type");
    await typeSelect.selectOptions("keyword");
    
    await expect.element(page.getByPlaceholder("spammer")).not.toBeInTheDocument();
    await expect.element(page.getByPlaceholder("SPAM")).toBeInTheDocument();
  });
});

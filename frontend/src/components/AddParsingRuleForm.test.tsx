import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
import { AddParsingRuleForm } from "./AddParsingRuleForm";

describe("AddParsingRuleForm", () => {
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
        <AddParsingRuleForm />
      </QueryClientProvider>
    </TransportProvider>
  );

  it("renders correctly", async () => {
    dispose = render(() => <TestWrapper />, document.body);
    await expect.element(page.getByText("Domain")).toBeInTheDocument();
    await expect.element(page.getByText(/Regex Pattern/i)).toBeInTheDocument();
    await expect.element(page.getByRole("button", { name: /Add Rule/i })).toBeInTheDocument();
  });

  it("submits the form correctly", async () => {
    let capturedRequest: any = null;
    worker.use(
      http.post("*/blocking.v1.BlockingService/CreateURLParsingRule", async ({ request }) => {
        capturedRequest = await request.json();
        return new HttpResponse(
          JSON.stringify({
            rule: {
              id: "1",
              domain: capturedRequest.domain,
              pattern: capturedRequest.pattern,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );

    dispose = render(() => <TestWrapper />, document.body);

    const domainInput = page.getByLabelText("Domain");
    const patternInput = page.getByLabelText(/Regex Pattern/i);
    const submitButton = page.getByRole("button", { name: /Add Rule/i });

    await domainInput.fill("example.com");
    await patternInput.fill("^https://example\\.com/users/([^/]+)");
    await submitButton.click();

    await expect.poll(() => capturedRequest).not.toBeNull();
    expect(capturedRequest).toEqual({
      domain: "example.com",
      pattern: "^https://example\\.com/users/([^/]+)",
    });

    await expect.element(domainInput).toHaveValue("");
    await expect.element(patternInput).toHaveValue("");
  });
});

import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { worker } from "./mocks/browser";
import { initOTEL } from "./otel";

vi.mock("web-vitals", () => ({
  onCLS: vi.fn(),
  onLCP: vi.fn(),
  onFCP: vi.fn(),
}));

import { onCLS, onLCP, onFCP } from "web-vitals";

describe("Frontend OTEL Instrumentation", () => {
  it("should add traceparent header to fetch requests", async () => {
    initOTEL();

    let traceparent: string | null = null;
    worker.use(
      http.get("http://localhost:3000/api/trace-test", ({ request }) => {
        traceparent = request.headers.get("traceparent");
        return new HttpResponse(null, { status: 200 });
      }),
    );

    // Use a small delay to ensure OTEL has time to wrap fetch if it's asynchronous
    await fetch("http://localhost:3000/api/trace-test");

    expect(traceparent).not.toBeNull();
  });

  it("should initialize web vitals reporters", () => {
    initOTEL();
    expect(onCLS).toHaveBeenCalled();
    expect(onLCP).toHaveBeenCalled();
    expect(onFCP).toHaveBeenCalled();
  });
});

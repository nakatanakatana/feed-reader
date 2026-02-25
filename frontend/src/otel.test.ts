import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { worker } from "./mocks/browser";
import { initOTEL, resetInitialized } from "./otel";

vi.mock("web-vitals", () => ({
  onCLS: vi.fn(),
  onLCP: vi.fn(),
  onFCP: vi.fn(),
}));

import { onCLS, onFCP, onLCP } from "web-vitals";

describe("Frontend OTEL Instrumentation", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_OTEL_EXPORTER_URL", "http://localhost:4318/v1/traces");
    resetInitialized();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

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

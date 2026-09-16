import { context, propagation, trace } from "@opentelemetry/api";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { worker } from "./mocks/browser";
import { initOTEL, resetInitialized } from "./otel";

vi.mock("@opentelemetry/exporter-trace-otlp-http", () => {
  class MockExporter {
    export = vi.fn(
      (_spans: unknown, resultCallback: (result: { code: number }) => void) =>
        resultCallback({ code: 0 }),
    );
    shutdown = vi.fn().mockResolvedValue(undefined);
  }

  return {
    OTLPTraceExporter: MockExporter,
  };
});

vi.mock("web-vitals", () => ({
  onCLS: vi.fn(),
  onLCP: vi.fn(),
  onFCP: vi.fn(),
}));

import { onCLS, onFCP, onLCP } from "web-vitals";

describe("Frontend OTEL instrumentation", () => {
  beforeEach(async () => {
    vi.stubEnv("VITE_OTEL_EXPORTER_URL", "http://localhost:4318/v1/traces");
    await resetInitialized();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await resetInitialized();
  });

  it("initializes without throwing with 2.x-compatible setup", () => {
    expect(() => initOTEL()).not.toThrow();
  });

  it("adds traceparent header to fetch requests", async () => {
    initOTEL({ exporterUrl: "http://localhost:4318/v1/traces" });

    // Give some time for patches to settle
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Diagnostic check: verify propagator directly
    const debugHeaders: Record<string, string> = {};
    const span = trace.getTracer("test").startSpan("test-span");
    context.with(trace.setSpan(context.active(), span), () => {
      propagation.inject(context.active(), debugHeaders);
    });
    span.end();
    console.log("OTEL Debug - Manual injection headers:", debugHeaders);

    let traceparent: string | null = null;
    worker.use(
      http.get("/api/trace-test", ({ request }) => {
        traceparent = request.headers.get("traceparent");
        console.log("OTEL Debug - MSW captured traceparent:", traceparent);
        return new HttpResponse(null, { status: 200 });
      }),
    );

    await fetch("/api/trace-test");

    expect(traceparent).not.toBeNull();
  });

  it("initializes web vitals reporters once", async () => {
    initOTEL();
    initOTEL();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onCLS).toHaveBeenCalledTimes(1);
    expect(onLCP).toHaveBeenCalledTimes(1);
    expect(onFCP).toHaveBeenCalledTimes(1);
  });
});

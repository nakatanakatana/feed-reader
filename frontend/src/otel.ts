import { context, propagation, trace } from "@opentelemetry/api";
import { getWebAutoInstrumentations } from "@opentelemetry/auto-instrumentations-web";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { type Metric, onCLS, onFCP, onLCP } from "web-vitals";

let initialized = false;
let provider: WebTracerProvider | null = null;
let unregisterInstrumentations: (() => void) | null = null;

export const resetInitialized = async () => {
  initialized = false;
  if (provider) {
    await provider.shutdown();
    provider = null;
  }
  if (unregisterInstrumentations) {
    unregisterInstrumentations();
    unregisterInstrumentations = null;
  }
  trace.disable();
  context.disable();
  propagation.disable();
};

export const initOTEL = (config?: { exporterUrl?: string }) => {
  if (initialized) {
    return;
  }

  const exporterUrl =
    config?.exporterUrl ?? import.meta.env.VITE_OTEL_EXPORTER_URL;
  if (!exporterUrl) {
    console.warn("OTEL exporter URL is not set, skipping initialization");
    return;
  }

  const exporter = new OTLPTraceExporter({
    url: exporterUrl,
  });

  provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "feed-reader-frontend",
    }),
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });

  const propagator = new W3CTraceContextPropagator();
  provider.register({
    contextManager: new ZoneContextManager(),
    propagator,
  });

  propagation.setGlobalPropagator(propagator);

  unregisterInstrumentations = registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
      ...getWebAutoInstrumentations({
        "@opentelemetry/instrumentation-fetch": {
          propagateTraceHeaderCorsUrls: [/.*/],
        },
      }),
    ],
  });

  // Simple Web Vitals instrumentation
  const tracer = trace.getTracer("web-vitals");
  const reportVitals = (metric: Metric) => {
    tracer.startActiveSpan(
      `web-vitals.${metric.name}`,
      {
        attributes: {
          "web_vitals.name": metric.name,
          "web_vitals.value": metric.value,
          "web_vitals.id": metric.id,
        },
      },
      (span) => {
        span.end();
      },
    );
  };

  onCLS(reportVitals);
  onLCP(reportVitals);
  onFCP(reportVitals);

  initialized = true;
};

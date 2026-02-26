import { trace } from "@opentelemetry/api";
import { getWebAutoInstrumentations } from "@opentelemetry/auto-instrumentations-web";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { Resource } from "@opentelemetry/resources";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { type Metric, onCLS, onFCP, onLCP } from "web-vitals";

let initialized = false;
let provider: WebTracerProvider | null = null;

export const resetInitialized = async () => {
  initialized = false;
  if (provider) {
    await provider.shutdown();
    provider = null;
  }
};

export const initOTEL = () => {
  if (initialized) {
    return;
  }

  const exporterUrl = import.meta.env.VITE_OTEL_EXPORTER_URL;
  if (!exporterUrl) {
    return;
  }

  provider = new WebTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: "feed-reader-frontend",
    }),
  });

  // Export to collector via proxy or direct URL
  const exporter = new OTLPTraceExporter({
    url: exporterUrl,
  });

  provider.addSpanProcessor(new BatchSpanProcessor(exporter));

  provider.register({
    contextManager: new ZoneContextManager(),
  });

  registerInstrumentations({
    instrumentations: [
      getWebAutoInstrumentations({
        // load custom configuration for extensions
        "@opentelemetry/instrumentation-fetch": {
          propagateTraceHeaderCorsUrls: [
            /localhost:8080/,
            /localhost:3000/,
            window.location.origin,
          ],
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

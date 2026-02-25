import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { getWebAutoInstrumentations } from "@opentelemetry/auto-instrumentations-web";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { onCLS, onLCP, onFCP, Metric } from "web-vitals";
import { trace } from "@opentelemetry/api";

export const initOTEL = () => {
  const provider = new WebTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: "feed-reader-frontend",
    }),
  });

  // Export to collector via proxy
  const exporter = new OTLPTraceExporter({
    url: "/api/otlp/v1/traces",
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
            new RegExp(window.location.origin),
          ],
        },
      }),
    ],
  });

  // Simple Web Vitals instrumentation
  const tracer = trace.getTracer("web-vitals");
  const reportVitals = (metric: Metric) => {
    const span = tracer.startSpan(`web-vitals.${metric.name}`, {
      attributes: {
        "web_vitals.name": metric.name,
        "web_vitals.value": metric.value,
        "web_vitals.id": metric.id,
      },
    });
    span.end();
  };

  onCLS(reportVitals);
  onLCP(reportVitals);
  onFCP(reportVitals);
};

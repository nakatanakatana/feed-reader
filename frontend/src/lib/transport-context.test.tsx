import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { transport } from "./query";
import { TransportProvider, useTransport } from "./transport-context";
import type { Transport } from "@connectrpc/connect";

describe("TransportContext", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  it("provides the transport", () => {
    let capturedTransport!: Transport;
    const TestComponent = () => {
      capturedTransport = useTransport();
      return <div>Test</div>;
    };

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <TestComponent />
        </TransportProvider>
      ),
      document.body,
    );

    expect(capturedTransport).toBe(transport);
  });
});

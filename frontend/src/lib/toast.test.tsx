import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { ToastProvider, useToast } from "./toast";

describe("Toast Context", () => {
  let dispose: (() => void) | undefined;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  it("provides show method", () => {
    let capturedContext: { show: (message: string) => void } | undefined;
    const TestComponent = () => {
      capturedContext = useToast();
      return <div>Test</div>;
    };

    dispose = render(
      () => (
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      ),
      document.body,
    );

    expect(capturedContext).toBeDefined();
    if (capturedContext) {
      expect(typeof capturedContext.show).toBe("function");
    }
  });

  it("throws error if used outside provider", () => {
    const TestComponent = () => {
      useToast();
      return <div>Test</div>;
    };

    expect(() => {
      dispose = render(() => <TestComponent />, document.body);
    }).toThrow("useToast must be used within a ToastProvider");
  });
});

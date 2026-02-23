import { render } from "solid-js/web";
import { describe, expect, it, vi } from "vitest";
import { createSignal, useContext } from "solid-js";
import { ToastProvider, useToast, ToastContext } from "./toast";

describe("Toast Context", () => {
  it("provides show method", () => {
    let capturedContext: any;
    const TestComponent = () => {
      capturedContext = useToast();
      return <div>Test</div>;
    };

    render(() => (
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    ), document.body);

    expect(capturedContext).toBeDefined();
    expect(typeof capturedContext.show).toBe("function");
  });

  it("throws error if used outside provider", () => {
    const TestComponent = () => {
      useToast();
      return <div>Test</div>;
    };

    expect(() => {
      render(() => <TestComponent />, document.body);
    }).toThrow("useToast must be used within a ToastProvider");
  });
});

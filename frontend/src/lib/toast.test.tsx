import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, toast, useToast } from "./toast";

describe("Toast Context", () => {
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    // Clear global toasts before each test
    const currentToasts = toast.toasts();
    for (const t of currentToasts) {
      toast.dismiss(t.id);
    }
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("provides show method via context", () => {
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

  it("exposes a global toast object that can show and dismiss toasts", () => {
    expect(toast.toasts()).toHaveLength(0);

    toast.show("Global error", "error");
    expect(toast.toasts()).toHaveLength(1);
    expect(toast.toasts()[0].message).toBe("Global error");
    expect(toast.toasts()[0].type).toBe("error");

    const id = toast.toasts()[0].id;
    toast.dismiss(id);
    expect(toast.toasts()).toHaveLength(0);
  });

  it("auto-dismisses toasts after 5 seconds", () => {
    dispose = render(
      () => (
        <ToastProvider>
          <div>Test</div>
        </ToastProvider>
      ),
      document.body,
    );

    toast.show("Auto dismiss test");
    expect(toast.toasts()).toHaveLength(1);

    // Fast forward 4.9 seconds
    vi.advanceTimersByTime(4900);
    expect(toast.toasts()).toHaveLength(1);

    // Fast forward to 5 seconds
    vi.advanceTimersByTime(100);
    expect(toast.toasts()).toHaveLength(0);
  });
});

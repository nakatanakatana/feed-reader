import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { ActionButton } from "./ActionButton";

describe("ActionButton styles", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  it("primary variant has solid blue background", async () => {
    dispose = render(
      () => <ActionButton variant="primary">Primary</ActionButton>,
      document.body,
    );
    const button = page.getByRole("button", { name: "Primary" });
    await expect.element(button).toBeInTheDocument();

    // In vitest browser, we can check styles
    const el = document.querySelector("button");
    if (!el) throw new Error("Button not found");
    const style = window.getComputedStyle(el);
    // blue.600 is likely #2563eb or rgb(37, 99, 235)
    expect(style.backgroundColor).toBe("rgb(37, 99, 235)");
    expect(style.color).toBe("rgb(255, 255, 255)");
  });

  it("secondary variant has outline style (currently failing - expected to be transparent)", async () => {
    dispose = render(
      () => <ActionButton variant="secondary">Secondary</ActionButton>,
      document.body,
    );
    const button = page.getByRole("button", { name: "Secondary" });
    await expect.element(button).toBeInTheDocument();

    const el = document.querySelector("button");
    if (!el) throw new Error("Button not found");
    const style = window.getComputedStyle(el);
    // Secondary should be transparent background with gray border
    // Current is gray.100 (rgb(243, 244, 246))
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)"); // transparent
    expect(style.color).toBe("rgb(75, 85, 99)"); // gray.600
    expect(style.borderColor).toBe("rgb(209, 213, 219)"); // gray.300
  });
});

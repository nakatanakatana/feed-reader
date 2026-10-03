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
    // Panda v2 emits the blue.600 token in OKLCH.
    expect(style.backgroundColor).toBe("oklch(0.546 0.245 262.881)");
    expect(style.color).toBe("rgb(255, 255, 255)");
  });

  it("secondary variant has an outline style", async () => {
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
    expect(style.backgroundColor).toBe("oklch(0 0 0 / 0)"); // transparent
    expect(style.color).toBe("oklch(0.446 0.03 256.802)"); // gray.600
    expect(style.borderColor).toBe("oklch(0.872 0.01 258.338)"); // gray.300
  });
});

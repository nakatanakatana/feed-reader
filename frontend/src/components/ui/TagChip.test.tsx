import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { TagChip } from "./TagChip";

describe("TagChip styles", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  it("selected TagChip has solid blue background", async () => {
    dispose = render(
      () => <TagChip selected={true}>Selected</TagChip>,
      document.body,
    );
    const chip = page.getByRole("button", { name: "Selected" });
    await expect.element(chip).toBeInTheDocument();

    const el = document.querySelector("button");
    if (!el) throw new Error("Button not found");
    const style = window.getComputedStyle(el);
    // Panda v2 emits the blue.600 token in OKLCH.
    expect(style.backgroundColor).toBe("oklch(0.546 0.245 262.881)");
    expect(style.color).toBe("rgb(255, 255, 255)");
  });

  it("unselected TagChip has outline style", async () => {
    dispose = render(
      () => <TagChip selected={false}>Unselected</TagChip>,
      document.body,
    );
    const chip = page.getByRole("button", { name: "Unselected" });
    await expect.element(chip).toBeInTheDocument();

    const el = document.querySelector("button");
    if (!el) throw new Error("Button not found");
    const style = window.getComputedStyle(el);
    expect(style.backgroundColor).toBe("oklch(0 0 0 / 0)"); // transparent
    expect(style.color).toBe("oklch(0.446 0.03 256.802)"); // gray.600
    expect(style.borderColor).toBe("oklch(0.872 0.01 258.338)"); // gray.300
  });
});

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
    
    const el = document.querySelector('button');
    const style = window.getComputedStyle(el!);
    // blue.600 is rgb(37, 99, 235)
    expect(style.backgroundColor).toBe("rgb(37, 99, 235)");
    expect(style.color).toBe("rgb(255, 255, 255)");
  });

  it("unselected TagChip has outline style", async () => {
    dispose = render(
      () => <TagChip selected={false}>Unselected</TagChip>,
      document.body,
    );
    const chip = page.getByRole("button", { name: "Unselected" });
    await expect.element(chip).toBeInTheDocument();
    
    const el = document.querySelector('button');
    const style = window.getComputedStyle(el!);
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)"); // transparent
    expect(style.color).toBe("rgb(75, 85, 99)"); // gray.600
    expect(style.borderColor).toBe("rgb(209, 213, 219)"); // gray.300
  });
});

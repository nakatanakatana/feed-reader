import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { HorizontalScrollList } from "./ui/HorizontalScrollList";
import { TagChip } from "./ui/TagChip";
import { css } from "../../styled-system/css";

describe("HorizontalScrollList", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  it("renders children in a single row with overflow-x: auto", async () => {
    dispose = render(
      () => (
        <div style={{ width: "200px" }}>
          <HorizontalScrollList>
            <div style={{ width: "100px", "flex-shrink": 0 }}>Item 1</div>
            <div style={{ width: "100px", "flex-shrink": 0 }}>Item 2</div>
            <div style={{ width: "100px", "flex-shrink": 0 }}>Item 3</div>
          </HorizontalScrollList>
        </div>
      ),
      document.body,
    );

    const scrollContainer = page.getByTestId("horizontal-scroll-container");
    await expect.element(scrollContainer).toBeInTheDocument();
    
    // Check computed styles
    const el = document.querySelector('[data-testid="horizontal-scroll-container"]')!;
    const style = window.getComputedStyle(el);
    expect(style.overflowX).toBe("auto");
    expect(style.flexWrap).toBe("nowrap");
  });

  it("shows right arrow when content overflows", async () => {
    dispose = render(
      () => (
        <div style={{ width: "100px", height: "50px" }}>
          <HorizontalScrollList>
            <div style={{ width: "80px", height: "20px", "flex-shrink": 0 }}>Item 1</div>
            <div style={{ width: "80px", height: "20px", "flex-shrink": 0 }}>Item 2</div>
          </HorizontalScrollList>
        </div>
      ),
      document.body,
    );

    await expect.element(page.getByRole("button", { name: "Scroll right" })).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Scroll left" })).not.toBeInTheDocument();
  });

  it("shows left arrow after scrolling", async () => {
    dispose = render(
      () => (
        <div style={{ width: "100px", height: "50px" }}>
          <HorizontalScrollList>
            <div style={{ width: "80px", height: "20px", "flex-shrink": 0 }}>Item 1</div>
            <div style={{ width: "80px", height: "20px", "flex-shrink": 0 }}>Item 2</div>
          </HorizontalScrollList>
        </div>
      ),
      document.body,
    );

    const scrollContainer = document.querySelector('[data-testid="horizontal-scroll-container"]') as HTMLDivElement;
    
    // Simulate scroll
    scrollContainer.scrollLeft = 50;
    scrollContainer.dispatchEvent(new Event("scroll"));

    await expect.element(page.getByRole("button", { name: "Scroll left" })).toBeVisible();
  });
});

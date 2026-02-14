import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { BulkActionBar } from "./BulkActionBar";

describe("BulkActionBar", () => {
  let dispose: (() => void) | undefined;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  it("renders at the bottom as a floating bar when items are selected", async () => {
    dispose = render(
      () => (
        <BulkActionBar selectedCount={5} onClear={() => {}}>
          <button type="button">Action</button>
        </BulkActionBar>
      ),
      document.body,
    );

    const actionBar = page.getByTestId("bulk-action-bar");
    await expect.element(actionBar).toBeVisible();

    // Verify fixed positioning
    const el = document.querySelector('[data-testid="bulk-action-bar"]');
    if (!el) throw new Error("bulk-action-bar not found");
    const style = window.getComputedStyle(el);
    expect(style.position).toBe("fixed");
    // Standard panda scale bottom: 6 -> 24px
    expect(style.bottom).toBe("24px");
  });

  it("does not render when no items are selected", async () => {
    dispose = render(
      () => (
        <BulkActionBar selectedCount={0} onClear={() => {}}>
          <button type="button">Action</button>
        </BulkActionBar>
      ),
      document.body,
    );

    const actionBar = page.getByTestId("bulk-action-bar");
    await expect.element(actionBar).not.toBeInTheDocument();
  });
});

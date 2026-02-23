import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { page } from "vitest/browser";
import { BlockRulesTable } from "./BlockRulesTable";
import { blockRulesStore } from "../lib/block-rules-store";

describe("BlockRulesTable Responsive", () => {
  let dispose: () => void;

  const mockRules = [
    { id: "1", ruleType: "user", value: "alice", domain: "github.com" },
  ];

  beforeEach(async () => {
    blockRulesStore.reset();
  });

  afterEach(async () => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    // Reset viewport to default
    await page.viewport?.(1280, 720);
  });

  it("shows mobile sort bar on narrow viewport", async () => {
    await page.viewport?.(400, 800);
    
    dispose = render(
      () => <BlockRulesTable rules={mockRules} onDelete={vi.fn()} isPending={false} />,
      document.body,
    );

    const sortLabel = page.getByText("Sort by:");
    await expect.element(sortLabel).toBeInTheDocument();
    await expect.element(sortLabel).toBeVisible();
  });

  it("hides mobile sort bar on desktop viewport", async () => {
    await page.viewport?.(1280, 720);
    
    dispose = render(
      () => <BlockRulesTable rules={mockRules} onDelete={vi.fn()} isPending={false} />,
      document.body,
    );

    const sortLabel = page.getByText("Sort by:");
    // It should be in document but not visible
    await expect.element(sortLabel).toBeInTheDocument();
    await expect.element(sortLabel).not.toBeVisible();
  });
});

import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { blockRulesStore } from "../lib/block-rules-store";
import { BlockRulesTable } from "./BlockRulesTable";

describe("BlockRulesTable", () => {
  let dispose: () => void;

  const mockRules = [
    { id: "1", ruleType: "user", value: "alice", domain: "github.com" },
    { id: "2", ruleType: "domain", value: "example.com", domain: "" },
  ];

  beforeEach(() => {
    blockRulesStore.reset();
    vi.spyOn(blockRulesStore, "setSort");
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders rules", async () => {
    dispose = render(
      () => (
        <BlockRulesTable
          rules={mockRules}
          onDelete={vi.fn()}
          isPending={false}
        />
      ),
      document.body,
    );

    // Use first() because it might be in both desktop and mobile views
    await expect.element(page.getByText("alice").first()).toBeInTheDocument();
    await expect
      .element(page.getByText("example.com").first())
      .toBeInTheDocument();
  });

  it("calls setSort when clicking Type (Desktop)", async () => {
    dispose = render(
      () => (
        <BlockRulesTable
          rules={mockRules}
          onDelete={vi.fn()}
          isPending={false}
        />
      ),
      document.body,
    );

    // Assuming desktop view based on 1280px viewport
    const typeButton = page.getByRole("button", { name: /Type/ }).first();
    await typeButton.click();
    expect(blockRulesStore.setSort).toHaveBeenCalledWith("ruleType");
  });

  it("calls onDelete when delete button is clicked", async () => {
    const onDelete = vi.fn();
    dispose = render(
      () => (
        <BlockRulesTable
          rules={mockRules}
          onDelete={onDelete}
          isPending={false}
        />
      ),
      document.body,
    );

    // There might be multiple delete buttons (desktop and mobile)
    const deleteButton = page.getByRole("button", { name: "Delete" }).first();
    await deleteButton.click();
    expect(onDelete).toHaveBeenCalledWith("1");
  });
});

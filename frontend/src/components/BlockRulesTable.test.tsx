import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { BlockRulesTable } from "./BlockRulesTable";

describe("BlockRulesTable", () => {
  let dispose: () => void;

  const mockRules = [
    { id: "1", ruleType: "user", value: "alice", domain: "github.com" },
    { id: "2", ruleType: "domain", value: "example.com", domain: "" },
  ];

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
          sortField={null}
          sortDirection="asc"
          onSort={vi.fn()}
        />
      ),
      document.body,
    );

    // Use first() because it might be in both desktop and mobile views
    await expect.element(page.getByText("alice").first()).toBeInTheDocument();
    await expect.element(page.getByText("example.com").first()).toBeInTheDocument();
  });

  it("calls onSort when clicking Type (Desktop)", async () => {
    const onSort = vi.fn();
    dispose = render(
      () => (
        <BlockRulesTable
          rules={mockRules}
          onDelete={vi.fn()}
          isPending={false}
          sortField={null}
          sortDirection="asc"
          onSort={onSort}
        />
      ),
      document.body,
    );

    // Assuming desktop view based on 1280px viewport
    const typeButton = page.getByRole("button", { name: /Type/ }).first();
    await typeButton.click();
    expect(onSort).toHaveBeenCalledWith("ruleType");
  });

  it("calls onDelete when delete button is clicked", async () => {
    const onDelete = vi.fn();
    dispose = render(
      () => (
        <BlockRulesTable
          rules={mockRules}
          onDelete={onDelete}
          isPending={false}
          sortField={null}
          sortDirection="asc"
          onSort={vi.fn()}
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

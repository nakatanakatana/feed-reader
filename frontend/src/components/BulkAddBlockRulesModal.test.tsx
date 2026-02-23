import { render } from "solid-js/web";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { page } from "vitest/browser";
import { BulkAddBlockRulesModal } from "./BulkAddBlockRulesModal";

describe("BulkAddBlockRulesModal", () => {
  let dispose: () => void;
  const onRegister = vi.fn();
  const onClose = vi.fn();

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders correctly when open", async () => {
    dispose = render(
      () => (
        <BulkAddBlockRulesModal
          isOpen={true}
          onClose={onClose}
          onRegister={onRegister}
          isPending={false}
        />
      ),
      document.body,
    );

    await expect.element(page.getByText("Bulk Add Block Rules")).toBeInTheDocument();
    await expect.element(page.getByPlaceholder(/user,john_doe/)).toBeInTheDocument();
  });

  it("parses CSV text and shows preview", async () => {
    dispose = render(
      () => (
        <BulkAddBlockRulesModal
          isOpen={true}
          onClose={onClose}
          onRegister={onRegister}
          isPending={false}
        />
      ),
      document.body,
    );

    const textarea = page.getByPlaceholder(/user,john_doe/);
    await textarea.fill(`user,john_doe
invalid,type
user_domain,jane_doe,example.com`);

    // Check preview rows
    await expect.element(page.getByRole("cell", { name: "john_doe", exact: true })).toBeInTheDocument();
    await expect.element(page.getByRole("cell", { name: "invalid", exact: true })).toBeInTheDocument();
    await expect.element(page.getByRole("cell", { name: "jane_doe", exact: true })).toBeInTheDocument();
    await expect.element(page.getByRole("cell", { name: "example.com", exact: true })).toBeInTheDocument();

    // Check validation status
    await expect.element(page.getByText("✓ Valid").first()).toBeInTheDocument();
    await expect.element(page.getByText(/Invalid rule type/).first()).toBeInTheDocument();
  });

  it("calls onRegister with valid rules only", async () => {
    dispose = render(
      () => (
        <BulkAddBlockRulesModal
          isOpen={true}
          onClose={onClose}
          onRegister={onRegister}
          isPending={false}
        />
      ),
      document.body,
    );

    const textarea = page.getByPlaceholder(/user,john_doe/);
    await textarea.fill(`user,john_doe
invalid,type`);

    const registerButton = page.getByRole("button", { name: "Register (1 rules)" });
    await registerButton.click();

    expect(onRegister).toHaveBeenCalledWith([
      { rule_type: "user", value: "john_doe", isValid: true },
    ]);
  });
});

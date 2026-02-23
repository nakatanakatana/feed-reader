import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { BulkAddBlockRulesModal } from "./BulkAddBlockRulesModal";

describe("BulkAddBlockRulesModal", () => {
  let dispose: () => void;
  const onRegister = vi.fn();
  const onClose = vi.fn();

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.resetAllMocks();
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

    await expect
      .element(page.getByText("Bulk Add Block Rules"))
      .toBeInTheDocument();
    await expect
      .element(page.getByPlaceholder(/user,john_doe/))
      .toBeInTheDocument();
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
    await expect
      .element(page.getByRole("cell", { name: "john_doe", exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("cell", { name: "invalid", exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("cell", { name: "jane_doe", exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("cell", { name: "example.com", exact: true }))
      .toBeInTheDocument();

    // Check validation status
    await expect.element(page.getByText("✓ Valid").first()).toBeInTheDocument();
    await expect
      .element(page.getByText(/Invalid rule type/).first())
      .toBeInTheDocument();
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

    const registerButton = page.getByRole("button", {
      name: "Register (1 rule)",
    });
    await registerButton.click();

    expect(onRegister).toHaveBeenCalledWith([
      { ruleType: "user", value: "john_doe" },
    ]);

    // Check success message
    await expect
      .element(page.getByText("Successfully registered rule!"))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("1 rule was registered."))
      .toBeInTheDocument();

    // Check Done button
    const doneButton = page.getByRole("button", { name: "Done" });
    await expect.element(doneButton).toBeInTheDocument();
    await doneButton.click();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error message when onRegister fails", async () => {
    onRegister.mockRejectedValue(new Error("Network error"));

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
    await textarea.fill("user,john_doe");

    const registerButton = page.getByRole("button", {
      name: "Register (1 rule)",
    });
    await registerButton.click();

    await expect.element(page.getByText("Network error")).toBeInTheDocument();
    expect(onRegister).toHaveBeenCalled();
  });

  it("handles file upload correctly", async () => {
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

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(
      ["user,file_user\nkeyword,file_keyword"],
      "rules.csv",
      {
        type: "text/csv",
      },
    );

    Object.defineProperty(input, "files", {
      value: [file],
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));

    // Verify preview updates
    await expect
      .element(page.getByRole("cell", { name: "file_user", exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("cell", { name: "file_keyword", exact: true }))
      .toBeInTheDocument();

    const registerButton = page.getByRole("button", {
      name: "Register (2 rules)",
    });
    await registerButton.click();

    expect(onRegister).toHaveBeenCalledWith([
      { ruleType: "user", value: "file_user" },
      { ruleType: "keyword", value: "file_keyword" },
    ]);
  });
});

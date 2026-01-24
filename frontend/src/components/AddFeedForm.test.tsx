import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { AddFeedForm } from "./AddFeedForm";
import * as db from "../lib/db";

// Mock the db module
vi.mock("../lib/db", () => ({
  addFeed: vi.fn(),
}));

describe("AddFeedForm", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("creates a new feed", async () => {
    (db.addFeed as any).mockResolvedValue({
      uuid: "1",
      url: "http://example.com",
      title: "Mocked Feed",
    });

    dispose = render(() => <AddFeedForm />, document.body);

    const input = page.getByPlaceholder("Feed URL");
    await input.fill("http://example.com");

    const button = page.getByText("Add Feed");
    await button.click();

    await expect
      .poll(() => (db.addFeed as any).mock.calls.length)
      .toBeGreaterThan(0);
    expect(db.addFeed).toHaveBeenCalledWith("http://example.com");
  });

  it("displays an error message when createFeed fails", async () => {
    (db.addFeed as any).mockRejectedValue(new Error("Invalid feed URL"));

    dispose = render(() => <AddFeedForm />, document.body);

    const input = page.getByPlaceholder("Feed URL");
    await input.fill("invalid-url");

    const button = page.getByText("Add Feed");
    await button.click();

    await expect
      .element(page.getByText(/Error: .*Invalid feed URL.*/))
      .toBeInTheDocument();
  });
});

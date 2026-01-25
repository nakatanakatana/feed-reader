import { render } from "solid-js/web";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { page } from "vitest/browser";
import { TagManagement } from "./TagManagement";
import { transport, queryClient } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { QueryClientProvider } from "@tanstack/solid-query";

describe("TagManagement", () => {
  let dispose: () => void;

  beforeEach(() => {
    queryClient.clear();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const TestWrapper = () => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        <TagManagement />
      </QueryClientProvider>
    </TransportProvider>
  );

  it("renders tag list and add form", async () => {
    dispose = render(() => <TestWrapper />, document.body);

    await expect.element(page.getByText("Tag Management")).toBeInTheDocument();
    await expect
      .element(page.getByPlaceholder("New tag name"))
      .toBeInTheDocument();

    // Mock tags from handlers.ts are "Tech" and "News"
    await expect.element(page.getByText("Tech")).toBeInTheDocument();
    await expect.element(page.getByText("News")).toBeInTheDocument();
  });

  it("adds a new tag", async () => {
    dispose = render(() => <TestWrapper />, document.body);

    const input = page.getByPlaceholder("New tag name");
    const button = page.getByText("Add Tag");

    await input.fill("NewTag");
    await button.click();

    await expect.element(page.getByText("NewTag")).toBeInTheDocument();
  });

  it("deletes a tag", async () => {
    dispose = render(() => <TestWrapper />, document.body);

    const techTag = page.getByText("Tech");
    await expect.element(techTag).toBeInTheDocument();

    const deleteButton = page.getByRole("button", { name: "Delete Tech" });
    await deleteButton.click();

    await expect.element(techTag).not.toBeInTheDocument();
  });
});
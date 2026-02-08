import { QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { TagManagement } from "./TagManagement";

// Mock useLiveQuery
vi.mock("@tanstack/solid-db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/solid-db")>();
  return {
    ...actual,
    useLiveQuery: vi.fn(() => {
      const result = () => [
        { id: "tag-1", name: "Tech", unreadCount: 5n },
        { id: "tag-2", name: "News", unreadCount: 3n },
      ];
      (result as { isLoading?: boolean }).isLoading = false;
      return result;
    }),
  };
});

describe("TagManagement", () => {
  let dispose: () => void;

  beforeEach(() => {
    queryClient.clear();
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

    await expect
      .element(page.getByPlaceholder("New tag name"))
      .toBeInTheDocument();

    // Mock tags from handlers.ts are "Tech" and "News"
    await expect.element(page.getByText("Tech")).toBeInTheDocument();
    await expect.element(page.getByText("News")).toBeInTheDocument();
  });

  it.skip("adds a new tag", async () => {
    dispose = render(() => <TestWrapper />, document.body);

    const input = page.getByPlaceholder("New tag name");
    const button = page.getByText("Add Tag");

    await input.fill("NewTag");
    await button.click();

    await expect.element(page.getByText("NewTag")).toBeInTheDocument();
  });

  it.skip("deletes a tag after confirmation when tag has feeds", async () => {
    dispose = render(() => <TestWrapper />, document.body);

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const techTag = page.getByText("Tech");
    await expect.element(techTag).toBeInTheDocument();

    const deleteButton = page.getByRole("button", { name: "Delete Tech" });
    await deleteButton.click();

    expect(confirmSpy).toHaveBeenCalled();
    await expect.element(techTag).not.toBeInTheDocument();
  });

  it.skip("skips confirmation when tag has no feeds", async () => {
    dispose = render(() => <TestWrapper />, document.body);

    const confirmSpy = vi.spyOn(window, "confirm");

    const input = page.getByPlaceholder("New tag name");
    const addButton = page.getByText("Add Tag");
    await input.fill("EmptyTag");
    await addButton.click();

    const emptyTag = page.getByText("EmptyTag");
    await expect.element(emptyTag).toBeInTheDocument();

    const deleteButton = page.getByRole("button", { name: "Delete EmptyTag" });
    await deleteButton.click();

    expect(confirmSpy).not.toHaveBeenCalled();
  });
});

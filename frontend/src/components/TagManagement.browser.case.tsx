import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import type { Tag } from "../lib/api/types-generated";
import { queryClient } from "../lib/query";
import { worker } from "../mocks/browser";
import {
  buildListTagsResponse,
  buildTag,
} from "../test-utils/openapi-fixtures";
import { TagManagement } from "./TagManagement";

const createInitialTags = (): Tag[] => [
  buildTag({ id: "tag-1", name: "Tech", unreadCount: "5", feedCount: "1" }),
  buildTag({ id: "tag-2", name: "News", unreadCount: "3", feedCount: "2" }),
];

describe("TagManagement", () => {
  let dispose: () => void;
  let tags: Tag[];

  beforeEach(() => {
    tags = createInitialTags();
    worker.use(
      http.get("*/api/v2/tags", () => {
        return HttpResponse.json(buildListTagsResponse(tags));
      }),
      http.post("*/api/v2/tags", async ({ request }) => {
        const body = (await request.json()) as { name: string };
        const tag = buildTag({
          id: crypto.randomUUID(),
          name: body.name,
        });
        tags = [...tags, tag];
        return HttpResponse.json({ tag });
      }),
      http.delete("*/api/v2/tags/:id", ({ params }) => {
        const id = String(params.id);
        tags = tags.filter((tag) => tag.id !== id);
        return HttpResponse.json({});
      }),
    );
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const TestWrapper = () => (
    <QueryClientProvider client={queryClient}>
      <TagManagement />
    </QueryClientProvider>
  );

  it("renders tag list and add form", async () => {
    dispose = render(() => <TestWrapper />, document.body);

    await expect
      .element(page.getByPlaceholder("New tag name"))
      .toBeInTheDocument();

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

  it("deletes a tag after confirmation when tag has feeds", async () => {
    dispose = render(() => <TestWrapper />, document.body);

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const techTag = page.getByText("Tech");
    await expect.element(techTag).toBeInTheDocument();

    const deleteButton = page.getByRole("button", { name: "Delete Tech" });
    await deleteButton.click();

    expect(confirmSpy).toHaveBeenCalled();
    await expect.element(techTag).not.toBeInTheDocument();
  });

  it("skips confirmation when tag has no feeds", async () => {
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

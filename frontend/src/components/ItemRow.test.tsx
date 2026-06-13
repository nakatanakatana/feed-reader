import { createQuery, QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import { Show } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { getItemsQueryOptions } from "../lib/db";
import { dateToTimestamp } from "../lib/item-utils";
import { queryClient } from "../lib/query";
import { worker } from "../mocks/browser";
import {
  create,
  ItemSchema,
  ListItemsResponseSchema,
  toJson,
  UpdateItemStatusResponseSchema,
} from "../test-utils/json-identity";
import { ItemRow } from "./ItemRow";

describe("ItemRow", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const mockItem = {
    id: "1",
    title: "Test Article Title",
    publishedAt: new Date("2026-03-01T00:00:00Z"),
    createdAt: new Date("2026-03-01T00:00:00Z"),
    description: "This is a test description snippet that should be displayed.",
    isRead: false,
    feedId: "feed-1",
  };

  it("renders item title, description and metadata", () => {
    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <ItemRow item={mockItem} onClick={() => {}} />
        </QueryClientProvider>
      ),
      document.body,
    );

    expect(page.getByText("Test Article Title")).toBeInTheDocument();
    expect(page.getByText(/Received:/).first()).toBeInTheDocument();
    expect(
      page.getByText(
        "This is a test description snippet that should be displayed.",
      ),
    ).toBeInTheDocument();

    expect(document.body.innerHTML).toMatchSnapshot();
  });

  it("renders read status correctly", () => {
    const readItem = { ...mockItem, isRead: true };

    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <ItemRow item={readItem} onClick={() => {}} />
        </QueryClientProvider>
      ),
      document.body,
    );

    expect(page.getByText("Read", { exact: true })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <ItemRow item={mockItem} onClick={onClick} />
        </QueryClientProvider>
      ),
      document.body,
    );

    const titleButton = page.getByRole("button", {
      name: "Test Article Title",
    });
    await titleButton.click();
    expect(onClick).toHaveBeenCalledWith(mockItem);
  });

  it("handles keyboard interaction with Enter/Space keys", async () => {
    const onClick = vi.fn();
    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <ItemRow item={mockItem} onClick={onClick} />
        </QueryClientProvider>
      ),
      document.body,
    );

    const titleButton = page.getByRole("button", {
      name: "Test Article Title",
    });

    // Test Enter key
    titleButton.element().focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledWith(mockItem);

    onClick.mockClear();

    // Test Space key
    titleButton.element().focus();
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledWith(mockItem);
  });

  it("handles middle-click by opening URL and marking as read", async () => {
    const windowOpenSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null);
    const onClick = vi.fn();
    const mockItemWithUrl = {
      ...mockItem,
      url: "https://example.com/test-article",
    };

    let updateCalled = false;
    worker.use(
      http.all("*/api/v2/items", () => {
        return HttpResponse.json(
          toJson(
            ListItemsResponseSchema,
            create(ListItemsResponseSchema, {
              items: [
                create(ItemSchema, {
                  ...mockItemWithUrl,
                  publishedAt: dateToTimestamp(mockItemWithUrl.publishedAt),
                  createdAt: dateToTimestamp(mockItemWithUrl.createdAt),
                }),
              ],
              nextPageToken: "",
            }),
          ),
        );
      }),
      http.post("*/api/v2/items/status", async ({ request }) => {
        const body = (await request.json()) as {
          ids: string[];
          isRead: boolean;
        };
        if (body.ids.includes("1") && body.isRead === true) {
          updateCalled = true;
        }
        return HttpResponse.json(
          toJson(
            UpdateItemStatusResponseSchema,
            create(UpdateItemStatusResponseSchema, {}),
          ),
        );
      }),
    );

    const TestObserved = () => {
      const itemsQuery = createQuery(() => getItemsQueryOptions(false, "30d"));
      return (
        <Show when={(itemsQuery.data?.length ?? 0) > 0}>
          <ItemRow item={mockItemWithUrl} onClick={onClick} />
        </Show>
      );
    };

    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <TestObserved />
        </QueryClientProvider>
      ),
      document.body,
    );

    const titleButton = page.getByRole("button", {
      name: "Test Article Title",
    });
    await expect.element(titleButton).toBeInTheDocument();

    // Simulate middle-click (button 1) via mousedown
    const mouseDownEvent = new MouseEvent("mousedown", {
      button: 1,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(mouseDownEvent, "preventDefault");
    titleButton.element().dispatchEvent(mouseDownEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://example.com/test-article",
      "_blank",
      "noopener,noreferrer",
    );
    expect(onClick).not.toHaveBeenCalled();

    // Check if mark as read was triggered
    await expect.poll(() => updateCalled).toBe(true);
  });

  // This test is now covered by the updated one above
});

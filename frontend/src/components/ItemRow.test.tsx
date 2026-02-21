import { create, toJson } from "@bufbuild/protobuf";
import { useLiveQuery } from "@tanstack/solid-db";
import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import { Show } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import {
  ListItemSchema,
  ListItemsResponseSchema,
  UpdateItemStatusResponseSchema,
} from "../gen/item/v1/item_pb";
import { items } from "../lib/db";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
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
    publishedAt: "2026-01-21T10:00:00Z",
    createdAt: "2026-01-20T10:00:00Z",
    description: "This is a test description snippet that should be displayed.",
    isRead: false,
    feedId: "feed-1",
    isHidden: false,
  };

  it("renders item title, description and metadata", () => {
    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemRow item={mockItem} onClick={() => {}} />
          </QueryClientProvider>
        </TransportProvider>
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
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemRow item={readItem} onClick={() => {}} />
          </QueryClientProvider>
        </TransportProvider>
      ),
      document.body,
    );

    expect(page.getByText("Read", { exact: true })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemRow item={mockItem} onClick={onClick} />
          </QueryClientProvider>
        </TransportProvider>
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
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <ItemRow item={mockItem} onClick={onClick} />
          </QueryClientProvider>
        </TransportProvider>
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
      http.all("*/item.v1.ItemService/ListItems", () => {
        return HttpResponse.json(
          toJson(
            ListItemsResponseSchema,
            create(ListItemsResponseSchema, {
              items: [create(ListItemSchema, mockItemWithUrl)],
              totalCount: 1,
            }),
          ),
        );
      }),
      http.post(
        "*/item.v1.ItemService/UpdateItemStatus",
        async ({ request }) => {
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
        },
      ),
    );

    const TestObserved = () => {
      const data = useLiveQuery((q) => q.from({ item: items() }));
      return (
        <Show when={data().length > 0}>
          <ItemRow item={mockItemWithUrl} onClick={onClick} />
        </Show>
      );
    };

    dispose = render(
      () => (
        <TransportProvider transport={transport}>
          <QueryClientProvider client={queryClient}>
            <TestObserved />
          </QueryClientProvider>
        </TransportProvider>
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

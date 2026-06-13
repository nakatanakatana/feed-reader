import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import type { JSX } from "solid-js";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { dateToTimestamp } from "../lib/item-utils";
import { queryClient } from "../lib/query";
import { ToastProvider } from "../lib/toast";
import { worker } from "../mocks/browser";
import { parseRequestMessage } from "../mocks/http";
import {
  create,
  GetItemResponseSchema,
  ItemSchema,
  toJson,
} from "../test-utils/json-identity";
import { ItemDetailModal } from "./ItemDetailModal";

describe("ItemDetailModal Focus", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const setupMockData = (itemId: string) => {
    worker.use(
      http.all("*/api/v2/items/:id", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: itemId,
            title: `Test Item ${itemId}`,
            description: "<p>Test Content</p>",
            publishedAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
            createdAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
            author: "Test Author",
            url: "http://example.com",
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
    );
  };

  const Wrapper = (props: { children: JSX.Element }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{props.children}</ToastProvider>
    </QueryClientProvider>
  );

  const expectFocusWithinDialog = async () => {
    await vi.waitFor(() => {
      const dialog = document.querySelector("dialog");
      expect(dialog).toBeTruthy();
      expect(dialog?.contains(document.activeElement)).toBe(true);
    });
  };

  it("retains focus on modal container after navigating to next item", async () => {
    // Setup initial data
    setupMockData("1");

    const [itemId, setItemId] = createSignal("1");

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal
            itemId={itemId()}
            onClose={() => {}}
            nextItemId="2"
            onNext={() => {
              // Simulate navigation by changing the item ID
              setupMockData("2"); // Mock next item
              setItemId("2");
            }}
          />
        </Wrapper>
      ),
      document.body,
    );

    // Initial check: Wait for modal to appear and focus to be set
    await expect.element(page.getByRole("dialog")).toBeInTheDocument();

    // Focus is kept inside the modal panel within the native dialog.
    await expectFocusWithinDialog();

    // Navigate to next item using keyboard shortcut 'j'
    await userEvent.keyboard("j");

    // Wait for the new item to load (optional, but good for realism)
    await expect.element(page.getByText("Test Item 2")).toBeInTheDocument();

    // ASSERT: Focus should remain inside the modal after navigation
    await expectFocusWithinDialog();
  });

  it("traps focus within the modal when pressing Tab", async () => {
    setupMockData("1");
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="1" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item 1")).toBeInTheDocument();

    await userEvent.keyboard("{Tab}");
    const titleLink = page.getByRole("link", { name: "Test Item 1" });
    await expect.element(titleLink).toHaveFocus();

    await userEvent.keyboard("{Tab}");
    const kebabMenu = page.getByRole("button", { name: "More actions" });
    await expect.element(kebabMenu).toHaveFocus();

    await userEvent.keyboard("{Tab}");
    const markAsReadButton = page.getByRole("button", { name: "Mark as Read" });
    await expect.element(markAsReadButton).toHaveFocus();

    await userEvent.keyboard("{Tab}");
    await expect.element(titleLink).toHaveFocus();
  });

  it("retains focus when navigating back to a previously opened item (cached)", async () => {
    const [itemId, setItemId] = createSignal("1");

    // Setup both mocks initially to simulate "cached" availability
    worker.use(
      http.all("*/api/v2/items/:id", async ({ request }) => {
        const body = (await parseRequestMessage(request)) as { id: string };
        const id = body.id;
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: id,
            title: `Test Item ${id}`,
            description: "<p>Test Content</p>",
            publishedAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
            createdAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
            author: "Test Author",
            url: "http://example.com",
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
    );

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal
            itemId={itemId()}
            onClose={() => {}}
            // Use simple logic for prev/next to avoid disabled buttons in test
            nextItemId={itemId() === "1" ? "2" : undefined}
            prevItemId={itemId() === "2" ? "1" : undefined}
            onNext={() => setItemId("2")}
            onPrev={() => setItemId("1")}
          />
        </Wrapper>
      ),
      document.body,
    );

    // 1. Initial Item 1
    await expect.element(page.getByText("Test Item 1")).toBeInTheDocument();
    await expectFocusWithinDialog();

    // 2. Navigate to Item 2 using 'j'
    await userEvent.keyboard("j");
    await expect.element(page.getByText("Test Item 2")).toBeInTheDocument();
    await expectFocusWithinDialog();

    // 3. Navigate back to Item 1 (Cached) using 'k'
    await userEvent.keyboard("k");
    await expect.element(page.getByText("Test Item 1")).toBeInTheDocument();
    await expectFocusWithinDialog();
  });

  it("calls onClose when backdrop is clicked", async () => {
    const onClose = vi.fn();
    setupMockData("1");
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="1" onClose={onClose} />
        </Wrapper>
      ),
      document.body,
    );

    const dialog = page.getByRole("dialog");
    await expect.element(dialog).toBeVisible();

    // Native backdrop clicks target the dialog element itself
    const dialogEl = await page.getByRole("dialog").element();
    dialogEl.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape key is pressed", async () => {
    const onClose = vi.fn();
    setupMockData("1");
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="1" onClose={onClose} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item 1")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});

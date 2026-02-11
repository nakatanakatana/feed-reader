import { create, toJson } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import type { JSX } from "solid-js";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { GetItemResponseSchema, ItemSchema } from "../gen/item/v1/item_pb";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { worker } from "../mocks/browser";
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
      http.post("*/item.v1.ItemService/GetItem", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: itemId,
            title: `Test Item ${itemId}`,
            description: "<p>Test Content</p>",
            publishedAt: "2026-01-24T10:00:00Z",
            createdAt: "2026-01-24T09:00:00Z",
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
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </TransportProvider>
  );

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

    // In the current implementation (Modal.tsx), focus is set onMount.
    // So initially, the dialog should be focused.
    await expect.element(page.getByRole("dialog")).toHaveFocus();

    // Navigate to next item using keyboard shortcut 'j'
    await userEvent.keyboard("j");

    // After navigation, itemId changes to "2".
    // We expect the focus to be returned to the modal container (dialog)
    // or at least stay inside the modal (e.g., on the Next button if it's still there).
    // However, the requirement is: "Automatically return focus to the modal's main container after the itemId changes."

    // Wait for the new item to load (optional, but good for realism)
    await expect.element(page.getByText("Test Item 2")).toBeInTheDocument();

    // ASSERT: Focus should be on the dialog (modal container)
    // This is expected to FAIL currently because there is no logic to re-focus the container on itemId change.
    await expect.element(page.getByRole("dialog")).toHaveFocus();
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

    // The DOM focus order:
    // 1. Header Title Link: <a ...>Test Item 1</a>
    // 2. Header Close Button
    // 3. Footer Mark as Read (Prev/Next are disabled in this test case so skipped)

    // Initial focus is on the dialog container (index -1)

    // Tab 1: Should go to Title Link
    await userEvent.keyboard("{Tab}");
    const titleLink = page.getByRole("link", { name: "Test Item 1" });
    await expect.element(titleLink).toHaveFocus();

    // Tab 2: Should go to Close Button
    await userEvent.keyboard("{Tab}");
    const closeButton = page.getByRole("button", { name: "Close" });
    await expect.element(closeButton).toHaveFocus();

    // Tab 3: Should go to Mark as Read Button
    await userEvent.keyboard("{Tab}");
    const markAsReadButton = page.getByRole("button", { name: "Mark as Read" });
    await expect.element(markAsReadButton).toHaveFocus();

    // Tab 4: Should WRAP AROUND to Title Link (Focus Trap)
    // This assertion fails if trap is missing.
    await userEvent.keyboard("{Tab}");
    await expect.element(titleLink).toHaveFocus();
  });

  it("retains focus when navigating back to a previously opened item (cached)", async () => {
    const [itemId, setItemId] = createSignal("1");

    // Setup both mocks initially to simulate "cached" availability
    worker.use(
      http.post("*/item.v1.ItemService/GetItem", async (info) => {
        const body = (await info.request.json()) as { id: string };
        const id = body.id;
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: id,
            title: `Test Item ${id}`,
            description: "<p>Test Content</p>",
            publishedAt: "2026-01-24T10:00:00Z",
            createdAt: "2026-01-24T09:00:00Z",
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
    await expect.element(page.getByRole("dialog")).toHaveFocus();

    // 2. Navigate to Item 2 using 'j'
    await userEvent.keyboard("j");
    await expect.element(page.getByText("Test Item 2")).toBeInTheDocument();

    // Wait for animation frame and check focus
    await vi.waitFor(async () => {
      await expect.element(page.getByRole("dialog")).toHaveFocus();
    });

    // 3. Navigate back to Item 1 (Cached) using 'k'
    await userEvent.keyboard("k");
    await expect.element(page.getByText("Test Item 1")).toBeInTheDocument();

    // ASSERT: Focus should still be on the dialog
    await vi.waitFor(async () => {
      await expect.element(page.getByRole("dialog")).toHaveFocus();
    });
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

    // The backdrop is the first child of document.body in our Modal implementation
    const backdrop = document.body.firstElementChild;
    if (!backdrop) throw new Error("Backdrop not found");
    backdrop.dispatchEvent(new MouseEvent("click", { bubbles: true }));

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

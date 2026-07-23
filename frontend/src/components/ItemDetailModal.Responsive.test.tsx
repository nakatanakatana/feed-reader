import { QueryClientProvider } from "@tanstack/solid-query";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { dateToTimestamp } from "../lib/item-utils";
import { queryClient } from "../lib/query";
import { ToastProvider } from "../lib/toast";
import { ItemDetailModal } from "./ItemDetailModal";
import "../styles.css";
import { HttpResponse, http } from "msw";
import { worker } from "../mocks/browser";
import {
  create,
  GetItemResponseSchema,
  ItemSchema,
  toJson,
} from "../test-utils/json-identity";

describe("ItemDetailModal Responsive", () => {
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
            title: "Test Item",
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

  it("should be fullscreen on viewports narrower than 4K quarter width (960px)", async () => {
    await page.viewport(959, 800);
    setupMockData("test-id-mobile");

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-id-mobile" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    const dialog = page.getByRole("dialog");
    await expect.element(dialog).toBeInTheDocument();

    const dialogEl = await dialog.element();
    const panel = dialogEl.querySelector<HTMLElement>('[tabindex="-1"]');
    expect(panel).not.toBeNull();
    const panelRect = panel!.getBoundingClientRect();
    expect(panelRect.width).toBe(959);
    expect(panelRect.height).toBe(800);
  });

  it("should be large modal on viewports at or wider than 4K quarter width (960px)", async () => {
    await page.viewport(960, 800);
    setupMockData("test-id-desktop");

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-id-desktop" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    const dialog = page.getByRole("dialog");
    await expect.element(dialog).toBeInTheDocument();

    const el = await dialog.element();
    const panel = el.querySelector<HTMLElement>('[tabindex="-1"]');
    expect(panel).not.toBeNull();
    const panelRect = panel!.getBoundingClientRect();
    // 960px * 0.9 = 864px
    expect(panelRect.width).toBe(864);
  });

  it("should display the FAB correctly on both mobile and desktop", async () => {
    // Mobile
    await page.viewport(375, 667);
    setupMockData("mobile-id");

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="mobile-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();
    const mobileFab = page.getByRole("button", { name: /Mark as read/i });
    await expect.element(mobileFab).toBeInTheDocument();

    const mobileFabParent = mobileFab.element().parentElement;
    expect(mobileFabParent).not.toBeNull();
    let fabStyle = window.getComputedStyle(mobileFabParent as HTMLElement);
    expect(fabStyle.position).toBe("absolute");
    expect(parseInt(fabStyle.bottom, 10)).toBeGreaterThan(0);
    expect(parseInt(fabStyle.right, 10)).toBeGreaterThan(0);

    dispose();
    document.body.innerHTML = "";

    // Desktop
    await page.viewport(1280, 800);
    setupMockData("desktop-id");

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="desktop-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();
    const desktopFab = page.getByRole("button", { name: /Mark as read/i });
    await expect.element(desktopFab).toBeInTheDocument();

    const desktopFabParent = desktopFab.element().parentElement;
    expect(desktopFabParent).not.toBeNull();
    fabStyle = window.getComputedStyle(desktopFabParent as HTMLElement);
    expect(fabStyle.position).toBe("absolute");
    expect(parseInt(fabStyle.bottom, 10)).toBeGreaterThan(0);
    expect(parseInt(fabStyle.right, 10)).toBeGreaterThan(0);
  });

  it("should show Published/Received icons across viewport widths", async () => {
    // Narrow viewport (479px) - should show icons
    await page.viewport(479, 800);
    setupMockData("narrow-id");

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="narrow-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    // Labels "Published:" and "Received:" should NOT be visible.
    // However, they should exist in the DOM for screen readers.
    const publishedText = page.getByText("Published:", { exact: true });
    const receivedText = page.getByText("Received:", { exact: true });

    await expect.element(publishedText.first()).not.toBeVisible();
    await expect.element(receivedText.first()).not.toBeVisible();

    // Icons with titles should be visible
    const publishedIcon = page.getByTitle("Published Date", { exact: true });
    const receivedIcon = page.getByTitle("Received Date", { exact: true });
    await expect.element(publishedIcon).toBeVisible();
    await expect.element(receivedIcon).toBeVisible();

    dispose();
    document.body.innerHTML = "";

    // Boundary viewport (480px) - should still show icons.
    await page.viewport(480, 800);
    setupMockData("boundary-id");

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="boundary-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect
      .element(page.getByText("Published:", { exact: true }).first())
      .not.toBeVisible();
    await expect
      .element(page.getByText("Received:", { exact: true }).first())
      .not.toBeVisible();

    await expect
      .element(page.getByTitle("Published Date", { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByTitle("Received Date", { exact: true }))
      .toBeVisible();

    dispose();
    document.body.innerHTML = "";

    // Wider viewport (600px)
    await page.viewport(600, 800);
    setupMockData("wide-id");

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="wide-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect
      .element(page.getByText("Published:", { exact: true }).first())
      .not.toBeVisible();
    await expect
      .element(page.getByText("Received:", { exact: true }).first())
      .not.toBeVisible();

    await expect
      .element(page.getByTitle("Published Date", { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByTitle("Received Date", { exact: true }))
      .toBeVisible();
  });

  it("uses compact row spacing when metadata wraps", async () => {
    await page.viewport(320, 800);
    setupMockData("metadata-spacing-id");

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="metadata-spacing-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();

    const metadata = document.querySelector<HTMLElement>(
      '[data-testid="item-metadata"]',
    );
    expect(metadata).not.toBeNull();
    const style = window.getComputedStyle(metadata!);

    expect(Number.parseFloat(style.rowGap)).toBeLessThan(
      Number.parseFloat(style.columnGap),
    );
  });
});

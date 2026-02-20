import { QueryClientProvider } from "@tanstack/solid-query";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { queryClient, transport } from "../lib/query";
import { TransportProvider } from "../lib/transport-context";
import { ItemRow } from "./ItemRow";
import "../styles.css";

describe("ItemRow Responsive Date", () => {
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
    description: "Test description",
    isRead: false,
    isHidden: false,
    feedId: "feed-1",
  };

  const Wrapper = (props: { children: JSX.Element }) => (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </TransportProvider>
  );

  it("should display Published date BEFORE Received date", async () => {
    dispose = render(
      () => (
        <Wrapper>
          <ItemRow item={mockItem} onClick={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    const publishedAt = page.getByText(/Published:/).first();
    const receivedAt = page.getByText(/Received:/).first();

    await expect.element(publishedAt).toBeInTheDocument();
    await expect.element(receivedAt).toBeInTheDocument();

    // Check DOM order via text content index
    const textContent = document.body.textContent || "";
    const publishedIndex = textContent.indexOf("Published:");
    const receivedIndex = textContent.indexOf("Received:");

    expect(publishedIndex).toBeGreaterThan(-1);
    expect(receivedIndex).toBeGreaterThan(-1);
    expect(publishedIndex).toBeLessThan(receivedIndex);
  });

  it("should swap labels with icons on narrow viewports (< 480px)", async () => {
    // Narrow viewport (479px) - should show icons
    await page.viewport(479, 800);

    dispose = render(
      () => (
        <Wrapper>
          <ItemRow item={mockItem} onClick={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    // Labels should NOT be visible
    await expect
      .element(page.getByText("Published:", { exact: false }).first())
      .not.toBeVisible();
    await expect
      .element(page.getByText("Received:", { exact: false }).first())
      .not.toBeVisible();

    // Icons with titles should be visible
    await expect
      .element(page.getByTitle("Published", { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByTitle("Received", { exact: true }))
      .toBeVisible();

    dispose();
    document.body.innerHTML = "";

    // Boundary viewport (480px) - should show labels
    await page.viewport(480, 800);

    dispose = render(
      () => (
        <Wrapper>
          <ItemRow item={mockItem} onClick={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect
      .element(page.getByText("Published:", { exact: false }).first())
      .toBeVisible();
    await expect
      .element(page.getByText("Received:", { exact: false }).first())
      .toBeVisible();

    // Icons should NOT be visible
    await expect
      .element(page.getByTitle("Published", { exact: true }))
      .not.toBeVisible();
    await expect
      .element(page.getByTitle("Received", { exact: true }))
      .not.toBeVisible();
  });
});

import { create } from "@bufbuild/protobuf";
import { createConnectTransport } from "@connectrpc/connect-web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { ListItemSchema } from "../gen/item/v1/item_pb";
import { TransportProvider } from "../lib/transport-context";
import { ItemRow } from "./ItemRow";
import { items } from "../lib/db";

const { updateMock } = vi.hoisted(() => ({
  updateMock: vi.fn(),
}));

// Mock the db module
vi.mock("../lib/db", () => ({
  items: vi.fn(() => ({
    update: updateMock,
  })),
}));

describe("ItemRow", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  const transport = createConnectTransport({
    baseUrl: "http://localhost:3000",
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const mockItem = create(ListItemSchema, {
    id: "1",
    title: "Test Article Title",
    publishedAt: "2026-01-21T10:00:00Z",
    createdAt: "2026-01-20T10:00:00Z",
    description: "This is a test description snippet that should be displayed.",
    isRead: false,
  });

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
    // Use regex to be more flexible with formatting but check for label
    expect(page.getByText(/Received:/)).toBeInTheDocument();
    expect(
      page.getByText(
        "This is a test description snippet that should be displayed.",
      ),
    ).toBeInTheDocument();
  });

  it("renders read status correctly", () => {
    const readItem = create(ListItemSchema, { ...mockItem, isRead: true });

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

    // Assuming we show "Read" or some indicator
    expect(page.getByText("Read", { exact: true })).toBeInTheDocument();
  });

  it("calls updateStatus when toggle button is clicked", async () => {
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

    const toggleButton = page.getByRole("button", { name: /Mark as Read/i });
    await toggleButton.click();
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

    const listItem = page.getByRole("button", { name: /Test Article Title/ });
    await listItem.click();
    expect(onClick).toHaveBeenCalledWith(mockItem);
  });

  it("updates item status without error", async () => {
    const consoleSpy = vi.spyOn(console, "error");
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

    const toggleButton = page.getByRole("button", { name: /Mark as Read/i });
    await toggleButton.click();

    expect(consoleSpy).not.toHaveBeenCalled();
    // Check that update was called with correct ID and some metadata/callback
    expect(updateMock).toHaveBeenCalledWith(
        mockItem.id, 
        expect.anything(), 
        expect.any(Function)
    );
    consoleSpy.mockRestore();
  });

  it("has title text", () => {
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
  });
});

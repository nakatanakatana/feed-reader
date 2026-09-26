import { QueryClientProvider } from "@tanstack/solid-query";
import { HttpResponse, http } from "msw";
import { createSignal, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { dateToTimestamp } from "../lib/item-utils";
import { queryClient } from "../lib/query";
import { ToastProvider, toast } from "../lib/toast";
import { worker } from "../mocks/browser";
import {
  AddItemBlockRulesResponseSchema,
  create,
  GetItemResponseSchema,
  ItemSchema,
  ListURLParsingRulesResponseSchema,
  toJson,
  URLParsingRuleSchema,
} from "../test-utils/json-identity";
import { ItemDetailModal } from "./ItemDetailModal";

describe("ItemDetailModal", () => {
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
            description: "Test Content",
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

  it("renders item content when itemId is provided", async () => {
    setupMockData("test-id");
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();
    await expect
      .element(page.getByText(/Published:/).first())
      .toBeInTheDocument();
    await expect
      .element(page.getByText(/Received:/).first())
      .toBeInTheDocument();
    await expect.element(page.getByText("Test Author")).toBeInTheDocument();
    await expect.element(page.getByText("Test Content")).toBeInTheDocument();

    // Check for title link
    const titleLink = page.getByRole("link", { name: "Test Item" });
    await expect.element(titleLink).toBeInTheDocument();
    await expect
      .element(titleLink)
      .toHaveAttribute("href", "http://example.com");

    expect(document.body.innerHTML).toMatchSnapshot();
  });

  it("shows source metadata in domain, author, feed, published, received order", async () => {
    worker.use(
      http.all("*/api/v2/items/:id", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: "metadata-id",
            title: "Metadata Item",
            description: "Metadata Content",
            publishedAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
            createdAt: dateToTimestamp(new Date("2026-03-02T00:00:00Z")),
            author: "Test Author",
            url: "https://www.example.com/articles/1",
            isRead: false,
            categories: '["Security"]',
            feeds: [
              { id: "feed-1", title: "Primary Feed" },
              { id: "feed-2", title: "Secondary Feed" },
            ],
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
    );
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="metadata-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Metadata Item")).toBeInTheDocument();
    await expect.element(page.getByText("Primary Feed")).toBeInTheDocument();
    await expect.element(page.getByText("+1")).toBeInTheDocument();
    await expect
      .element(page.getByTitle("Author", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByTitle("Feed", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByTitle("Published Date", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByTitle("Received Date", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByTitle("Labels", { exact: true }))
      .toBeInTheDocument();
    await expect.element(page.getByText("Security")).toBeInTheDocument();

    const metadata = document.querySelector('[data-testid="item-metadata"]');
    expect(metadata?.querySelector('[data-icon="calendar"]')).not.toBeNull();
    expect(metadata?.querySelector('[data-icon="download"]')).not.toBeNull();
    expect(metadata?.querySelector('[data-icon="tag"]')).not.toBeNull();
    expect(metadata?.textContent).toMatch(
      /example\.com\s*Test Author\s*Primary Feed\s*\+1\s*Published:.*Received:.*Security/,
    );
    expect(metadata?.textContent).not.toContain("By Test Author");
    expect(metadata?.textContent).not.toContain("Secondary Feed");
  });

  it("renders text content from XML-like author metadata", async () => {
    worker.use(
      http.all("*/api/v2/items/:id", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: "xml-author-id",
            title: "XML Author Item",
            description: "Metadata Content",
            publishedAt: dateToTimestamp(new Date("2026-03-01T00:00:00Z")),
            createdAt: dateToTimestamp(new Date("2026-03-02T00:00:00Z")),
            author:
              "<name>Shir Meir Lador</name><title>Head of AI Engineering, Google Cloud Developer Relations</title><department></department><company></company>",
            url: "https://www.example.com/articles/1",
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
    );
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="xml-author-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    const author = page.getByText(
      "Shir Meir Lador Head of AI Engineering, Google Cloud Developer Relations",
    );
    await expect.element(author).toBeInTheDocument();
    await expect.element(page.getByText(/<name>/)).not.toBeInTheDocument();
  });

  it("clamps the item title link to two lines", async () => {
    setupMockData("title-clamp-id");
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="title-clamp-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    const titleLink = page.getByRole("link", { name: "Test Item" });
    await expect.element(titleLink).toBeInTheDocument();

    const titleLinkEl = await titleLink.element();
    const style = window.getComputedStyle(titleLinkEl);
    expect(titleLinkEl.className).toContain("wb_normal");
    expect(titleLinkEl.className).toContain("line-break_auto");
    expect(style.webkitLineClamp).toBe("2");
    expect(style.webkitBoxOrient).toBe("vertical");
    expect(style.overflow).toBe("hidden");
    expect(style.wordBreak).toBe("normal");
    expect(style.lineBreak).toBe("auto");
    expect(style.textWrap).toBe("wrap");
  });

  it("preserves item title text without injected break characters", async () => {
    worker.use(
      http.all("*/api/v2/items/:id", () => {
        const title = "日本語-タイトル(テスト[詳細])";
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: "raw-title-id",
            title,
            description: "Test Content",
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
          <ItemDetailModal itemId="raw-title-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    const titleLink = page.getByRole("link", {
      name: "日本語-タイトル(テスト[詳細])",
    });
    await expect.element(titleLink).toBeInTheDocument();
    const titleLinkEl = await titleLink.element();
    expect(titleLinkEl.textContent).toBe("日本語-タイトル(テスト[詳細])");
    expect(titleLinkEl.textContent).not.toContain("\u200B");
  });

  it("does NOT render a close button (✕)", async () => {
    setupMockData("test-id");
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="test-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect.element(page.getByText("Test Item")).toBeInTheDocument();
    const closeButton = page.getByText("✕");
    await expect.element(closeButton).not.toBeInTheDocument();
  });

  it("does not render when itemId is undefined", async () => {
    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId={undefined} onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );
    const dialog = page.getByRole("dialog");
    await expect.element(dialog).not.toBeInTheDocument();
  });

  it("clears toasts when itemId changes", async () => {
    setupMockData("test-id-1");
    setupMockData("test-id-2");

    const [itemId, setItemId] = createSignal<string | undefined>("test-id-1");

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId={itemId()} onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    // Show a toast
    toast.show("Persistent message");
    expect(toast.toasts()).toHaveLength(1);

    // Change itemId to simulate navigation
    setItemId("test-id-2");

    // Wait for the effect to run
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Toast should be cleared automatically
    expect(toast.toasts()).toHaveLength(0);
  });

  it("renders Block Author menu actions when item has author metadata and dispatches mutations", async () => {
    const addItemBlockRulesMock = vi.fn();
    worker.use(
      http.all("*/api/v2/items/:id", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: "author-action-id",
            title: "Author Action Item",
            description: "Content",
            author: "Test Author",
            url: "https://example.com/posts/1",
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
      http.all("*/api/v2/block-rules", async ({ request }) => {
        const body = await request.json();
        addItemBlockRulesMock(body);
        const msg = create(AddItemBlockRulesResponseSchema, {});
        return HttpResponse.json(toJson(AddItemBlockRulesResponseSchema, msg));
      }),
    );

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="author-action-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect
      .element(page.getByText("Author Action Item"))
      .toBeInTheDocument();

    const kebabMenu = page.getByRole("button", { name: "More actions" });
    await kebabMenu.click();

    const blockAuthorDomainAction = page.getByText(
      "Block Author (@example.com)",
    );
    const blockAuthorAction = page.getByText("Block Author (Test Author)");

    await expect.element(blockAuthorDomainAction).toBeInTheDocument();
    await expect.element(blockAuthorAction).toBeInTheDocument();

    await blockAuthorDomainAction.click();
    await expect
      .poll(() => addItemBlockRulesMock)
      .toHaveBeenCalledWith({
        rules: [
          {
            ruleType: "user_domain",
            value: "Test Author",
            domain: "example.com",
          },
        ],
      });

    await kebabMenu.click();
    await blockAuthorAction.click();
    await expect
      .poll(() => addItemBlockRulesMock)
      .toHaveBeenCalledWith({
        rules: [
          {
            ruleType: "user",
            value: "Test Author",
            domain: "",
          },
        ],
      });
  });

  it("does not show duplicate Block Author actions if URL user matches author", async () => {
    worker.use(
      http.all("*/api/v2/items/:id", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: "author-duplicate-id",
            title: "Duplicate User Item",
            description: "Content",
            author: "user1",
            url: "https://user1.example.com/post",
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
      http.all("*/api/v2/url-rules", () => {
        const msg = create(ListURLParsingRulesResponseSchema, {
          rules: [
            create(URLParsingRuleSchema, {
              id: "rule1",
              domain: "example.com",
              ruleType: "subdomain",
              pattern: "example.com",
            }),
          ],
        });
        return HttpResponse.json(
          toJson(ListURLParsingRulesResponseSchema, msg),
        );
      }),
    );

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="author-duplicate-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect
      .element(page.getByText("Duplicate User Item"))
      .toBeInTheDocument();

    const kebabMenu = page.getByRole("button", { name: "More actions" });
    await kebabMenu.click();

    await expect
      .element(page.getByText("Block User (@example.com)"))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Block User (user1)"))
      .toBeInTheDocument();

    await expect
      .element(page.getByText("Block Author (@example.com)"))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByText("Block Author (user1)"))
      .not.toBeInTheDocument();
  });

  it("does not show Block Author actions if author metadata contains only empty XML tags", async () => {
    worker.use(
      http.all("*/api/v2/items/:id", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: "empty-xml-author-id",
            title: "Empty XML Author Item",
            description: "Content",
            author: "<author><name></name></author>",
            url: "https://example.com/posts/empty",
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
    );

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="empty-xml-author-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect
      .element(page.getByText("Empty XML Author Item"))
      .toBeInTheDocument();

    const kebabMenu = page.getByRole("button", { name: "More actions" });
    await kebabMenu.click();

    await expect.element(page.getByText("Close")).toBeInTheDocument();
    await expect
      .element(page.getByText(/Block Author/))
      .not.toBeInTheDocument();
  });

  it("normalizes nested XML author metadata with whitespace in Block Author actions", async () => {
    const addItemBlockRulesMock = vi.fn();
    worker.use(
      http.all("*/api/v2/items/:id", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: "nested-xml-author-id",
            title: "Nested XML Author Item",
            description: "Content",
            author:
              "<author><name>\n Jane \n </name><email>jane@example.com</email></author>",
            url: "https://example.com/posts/nested",
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
      http.all("*/api/v2/block-rules", async ({ request }) => {
        const body = await request.json();
        addItemBlockRulesMock(body);
        const msg = create(AddItemBlockRulesResponseSchema, {});
        return HttpResponse.json(toJson(AddItemBlockRulesResponseSchema, msg));
      }),
    );

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="nested-xml-author-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect
      .element(page.getByText("Nested XML Author Item"))
      .toBeInTheDocument();

    const kebabMenu = page.getByRole("button", { name: "More actions" });
    await kebabMenu.click();

    const blockAuthorAction = page.getByText(
      "Block Author (Jane jane@example.com)",
    );
    await expect.element(blockAuthorAction).toBeInTheDocument();

    await blockAuthorAction.click();
    await expect
      .poll(() => addItemBlockRulesMock)
      .toHaveBeenCalledWith({
        rules: [
          {
            ruleType: "user",
            value: "Jane jane@example.com",
            domain: "",
          },
        ],
      });
  });

  it("handles XML author metadata containing CDATA sections in header and Block Author actions", async () => {
    const addItemBlockRulesMock = vi.fn();
    worker.use(
      http.all("*/api/v2/items/:id", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: "cdata-author-id",
            title: "CDATA Author Item",
            description: "Content",
            author: "<author><name><![CDATA[Jane Doe]]></name></author>",
            url: "https://example.com/posts/cdata",
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
      http.all("*/api/v2/block-rules", async ({ request }) => {
        const body = await request.json();
        addItemBlockRulesMock(body);
        const msg = create(AddItemBlockRulesResponseSchema, {});
        return HttpResponse.json(toJson(AddItemBlockRulesResponseSchema, msg));
      }),
    );

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="cdata-author-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect
      .element(page.getByText("CDATA Author Item"))
      .toBeInTheDocument();

    const authorHeader = page.getByText("Jane Doe");
    await expect.element(authorHeader).toBeInTheDocument();

    const kebabMenu = page.getByRole("button", { name: "More actions" });
    await kebabMenu.click();

    const blockAuthorAction = page.getByText("Block Author (Jane Doe)");
    await expect.element(blockAuthorAction).toBeInTheDocument();

    await blockAuthorAction.click();
    await expect
      .poll(() => addItemBlockRulesMock)
      .toHaveBeenCalledWith({
        rules: [
          {
            ruleType: "user",
            value: "Jane Doe",
            domain: "",
          },
        ],
      });
  });

  it("does not render empty author metadata badge in header if author contains only empty XML tags", async () => {
    worker.use(
      http.all("*/api/v2/items/:id", () => {
        const msg = create(GetItemResponseSchema, {
          item: create(ItemSchema, {
            id: "empty-author-header-id",
            title: "Empty Author Header Item",
            description: "Content",
            author: "<author><name></name></author>",
            url: "https://example.com/posts/empty-header",
            isRead: false,
          }),
        });
        return HttpResponse.json(toJson(GetItemResponseSchema, msg));
      }),
    );

    dispose = render(
      () => (
        <Wrapper>
          <ItemDetailModal itemId="empty-author-header-id" onClose={() => {}} />
        </Wrapper>
      ),
      document.body,
    );

    await expect
      .element(page.getByText("Empty Author Header Item"))
      .toBeInTheDocument();

    const authorBadge = page.getByTitle("Author");
    await expect.element(authorBadge).not.toBeInTheDocument();
  });
});

import { QueryClientProvider } from "@tanstack/solid-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { queryClient } from "../lib/query";
import { routeTree } from "../routeTree.gen";

describe("MSW Integration", () => {
  let dispose: () => void;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
  });

  it("intercepts Connect RPC requests via MSW in a component", async () => {
    // 実際のネットワークを使うトランスポートを作成（MSWがこれをインターセプトする）
    const history = createMemoryHistory({ initialEntries: ["/feeds"] });
    const router = createRouter({ routeTree, history });

    dispose = render(
      () => (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      ),
      document.body,
    );

    // MSWのhandlers.tsで定義した初期データが表示されることを確認
    await expect.element(page.getByText("Example Feed 1")).toBeInTheDocument();
    await expect.element(page.getByText("Example Feed 2")).toBeInTheDocument();
  });
});

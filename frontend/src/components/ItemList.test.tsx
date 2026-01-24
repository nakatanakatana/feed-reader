import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { ItemList } from "./ItemList";
import { queryClient } from "../lib/query";

describe("ItemList", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    queryClient.clear();
  });

  it("renders a list of items", async () => {
    dispose = render(
      () => <ItemList />,
      document.body,
    );

    // Should show loading initially or eventually show items
    await expect
      .element(page.getByText("Item 1", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Item 20", { exact: true }))
      .toBeInTheDocument();
  });
});

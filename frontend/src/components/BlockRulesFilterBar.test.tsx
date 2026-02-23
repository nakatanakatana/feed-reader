import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { page } from "vitest/browser";
import { BlockRulesFilterBar } from "./BlockRulesFilterBar";
import { blockRulesStore } from "../lib/block-rules-store";

describe("BlockRulesFilterBar", () => {
  let dispose: () => void;

  beforeEach(() => {
    blockRulesStore.reset();
    vi.spyOn(blockRulesStore, "setTypeFilter");
    vi.spyOn(blockRulesStore, "setDomainFilter");
  });

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders type and domain filters", async () => {
    dispose = render(
      () => <BlockRulesFilterBar domains={["example.com", "test.org"]} />,
      document.body,
    );

    await expect.element(page.getByText("Filter:")).toBeInTheDocument();
    await expect.element(page.getByText("Domain:")).toBeInTheDocument();

    const typeSelect = page.getByLabelText("Filter:");
    const domainSelect = page.getByLabelText("Domain:");

    await expect.element(typeSelect).toBeInTheDocument();
    await expect.element(domainSelect).toBeInTheDocument();
  });

  it("updates type filter when changed", async () => {
    dispose = render(
      () => <BlockRulesFilterBar domains={[]} />,
      document.body,
    );

    const typeSelect = page.getByLabelText("Filter:");
    await typeSelect.selectOptions("user");

    expect(blockRulesStore.setTypeFilter).toHaveBeenCalledWith("user");
  });

  it("updates domain filter when changed", async () => {
    dispose = render(
      () => <BlockRulesFilterBar domains={["example.com"]} />,
      document.body,
    );

    const domainSelect = page.getByLabelText("Domain:");
    await domainSelect.selectOptions("example.com");

    expect(blockRulesStore.setDomainFilter).toHaveBeenCalledWith("example.com");
  });

  it("resets filters when 'All' is selected", async () => {
    dispose = render(
      () => <BlockRulesFilterBar domains={["example.com"]} />,
      document.body,
    );

    const typeSelect = page.getByLabelText("Filter:");
    await typeSelect.selectOptions("ALL_TYPES");
    expect(blockRulesStore.setTypeFilter).toHaveBeenCalledWith(null);

    const domainSelect = page.getByLabelText("Domain:");
    await domainSelect.selectOptions("ALL_DOMAINS");
    expect(blockRulesStore.setDomainFilter).toHaveBeenCalledWith(null);
  });
});

import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { BlockRulesFilterBar } from "./BlockRulesFilterBar";

describe("BlockRulesFilterBar", () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders type and domain filters", async () => {
    dispose = render(
      () => (
        <BlockRulesFilterBar
          domains={["example.com", "test.org"]}
          typeFilter={null}
          setTypeFilter={vi.fn()}
          domainFilter={null}
          setDomainFilter={vi.fn()}
        />
      ),
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
    const setTypeFilter = vi.fn();
    dispose = render(
      () => (
        <BlockRulesFilterBar
          domains={[]}
          typeFilter={null}
          setTypeFilter={setTypeFilter}
          domainFilter={null}
          setDomainFilter={vi.fn()}
        />
      ),
      document.body,
    );

    const typeSelect = page.getByLabelText("Filter:");
    await typeSelect.selectOptions("user");

    expect(setTypeFilter).toHaveBeenCalledWith("user");
  });

  it("updates domain filter when changed", async () => {
    const setDomainFilter = vi.fn();
    dispose = render(
      () => (
        <BlockRulesFilterBar
          domains={["example.com"]}
          typeFilter={null}
          setTypeFilter={vi.fn()}
          domainFilter={null}
          setDomainFilter={setDomainFilter}
        />
      ),
      document.body,
    );

    const domainSelect = page.getByLabelText("Domain:");
    await domainSelect.selectOptions("example.com");

    expect(setDomainFilter).toHaveBeenCalledWith("example.com");
  });

  it("resets filters when 'All' is selected", async () => {
    const setTypeFilter = vi.fn();
    const setDomainFilter = vi.fn();
    dispose = render(
      () => (
        <BlockRulesFilterBar
          domains={["example.com"]}
          typeFilter="user"
          setTypeFilter={setTypeFilter}
          domainFilter="example.com"
          setDomainFilter={setDomainFilter}
        />
      ),
      document.body,
    );

    const typeSelect = page.getByLabelText("Filter:");
    await typeSelect.selectOptions("ALL_TYPES");
    expect(setTypeFilter).toHaveBeenCalledWith(null);

    const domainSelect = page.getByLabelText("Domain:");
    await domainSelect.selectOptions("ALL_DOMAINS");
    expect(setDomainFilter).toHaveBeenCalledWith(null);
  });
});

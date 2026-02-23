import { describe, expect, it } from "vitest";
import { blockRulesStore } from "./block-rules-store";

describe("block-rules-store", () => {
  it("should have initial default values", () => {
    expect(blockRulesStore.state.typeFilter).toBeNull();
    expect(blockRulesStore.state.domainFilter).toBeNull();
    expect(blockRulesStore.state.sortField).toBeNull();
    expect(blockRulesStore.state.sortDirection).toBe("asc");
  });

  it("should update type filter", () => {
    blockRulesStore.setTypeFilter("User");
    expect(blockRulesStore.state.typeFilter).toBe("User");
    blockRulesStore.setTypeFilter(null);
    expect(blockRulesStore.state.typeFilter).toBeNull();
  });

  it("should update domain filter", () => {
    blockRulesStore.setDomainFilter("github.com");
    expect(blockRulesStore.state.domainFilter).toBe("github.com");
    blockRulesStore.setDomainFilter(null);
    expect(blockRulesStore.state.domainFilter).toBeNull();
  });

  it("should update sort state", () => {
    blockRulesStore.setSort("ruleType");
    expect(blockRulesStore.state.sortField).toBe("ruleType");
    expect(blockRulesStore.state.sortDirection).toBe("asc");

    // Toggle same field: asc -> desc
    blockRulesStore.setSort("ruleType");
    expect(blockRulesStore.state.sortField).toBe("ruleType");
    expect(blockRulesStore.state.sortDirection).toBe("desc");

    // Toggle same field: desc -> asc
    blockRulesStore.setSort("ruleType");
    expect(blockRulesStore.state.sortField).toBe("ruleType");
    expect(blockRulesStore.state.sortDirection).toBe("asc");

    // Switch field: reset to asc
    blockRulesStore.setSort("value");
    expect(blockRulesStore.state.sortField).toBe("value");
    expect(blockRulesStore.state.sortDirection).toBe("asc");
  });
});

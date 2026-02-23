import { beforeEach, describe, expect, it } from "vitest";
import { blockRulesStore } from "./block-rules-store";

describe("block-rules-store", () => {
  beforeEach(() => {
    blockRulesStore.reset();
  });

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

  describe("deriveVisibleRules", () => {
    const mockRules = [
      { id: "1", ruleType: "User", value: "alice", domain: "github.com" },
      { id: "2", ruleType: "Domain", value: "example.com", domain: "" },
      { id: "3", ruleType: "User", value: "bob", domain: "twitter.com" },
    ];

    it("should return all rules when no filters are set", () => {
      blockRulesStore.setTypeFilter(null);
      blockRulesStore.setDomainFilter(null);
      const visible = blockRulesStore.deriveVisibleRules(mockRules);
      expect(visible).toHaveLength(3);
    });

    it("should filter by type", () => {
      blockRulesStore.setTypeFilter("User");
      const visible = blockRulesStore.deriveVisibleRules(mockRules);
      expect(visible).toHaveLength(2);
      expect(visible.every((r) => r.ruleType === "User")).toBe(true);
    });

    it("should filter by domain", () => {
      blockRulesStore.setTypeFilter(null);
      blockRulesStore.setDomainFilter("github.com");
      const visible = blockRulesStore.deriveVisibleRules(mockRules);
      expect(visible).toHaveLength(1);
      expect(visible[0].id).toBe("1");
    });

    it("should sort by value asc", () => {
      blockRulesStore.setDomainFilter(null);
      blockRulesStore.setSort("value"); // first call sets to asc
      const visible = blockRulesStore.deriveVisibleRules(mockRules);
      expect(visible[0].value).toBe("alice");
      expect(visible[1].value).toBe("bob");
      expect(visible[2].value).toBe("example.com");
    });

    it("should sort by value desc", () => {
      blockRulesStore.setSort("value"); // first call: asc
      blockRulesStore.setSort("value"); // second call: desc
      const visible = blockRulesStore.deriveVisibleRules(mockRules);
      expect(visible[0].value).toBe("example.com");
      expect(visible[1].value).toBe("bob");
      expect(visible[2].value).toBe("alice");
    });

    it("should handle identical values during sort", () => {
      const identicalRules = [
        { id: "1", ruleType: "User", value: "alice", domain: "a" },
        { id: "2", ruleType: "User", value: "alice", domain: "b" },
      ];
      blockRulesStore.setSort("ruleType");
      const visible = blockRulesStore.deriveVisibleRules(identicalRules);
      expect(visible).toHaveLength(2);
      expect(visible[0].value).toBe("alice");
      expect(visible[1].value).toBe("alice");
    });
  });
});

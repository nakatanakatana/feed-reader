import { createRoot } from "solid-js";
import { createStore } from "solid-js/store";

export type BlockRulesSortField = "ruleType" | "value" | "domain";

interface BlockRulesState {
  typeFilter: string | null;
  domainFilter: string | null;
  sortField: BlockRulesSortField | null;
  sortDirection: "asc" | "desc";
}

function createBlockRulesStore() {
  const [state, setState] = createStore<BlockRulesState>({
    typeFilter: null,
    domainFilter: null,
    sortField: null,
    sortDirection: "asc",
  });

  const setTypeFilter = (type: string | null) => {
    setState("typeFilter", type);
  };

  const setDomainFilter = (domain: string | null) => {
    setState("domainFilter", domain);
  };

  const setSort = (field: BlockRulesSortField) => {
    if (state.sortField === field) {
      setState("sortDirection", (dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setState("sortField", field);
      setState("sortDirection", "asc");
    }
  };

  const deriveVisibleRules = <T extends { ruleType: string; value: string; domain?: string }>(
    rules: T[],
  ): T[] => {
    let result = [...rules];

    // Filtering
    if (state.typeFilter) {
      result = result.filter((r) => r.ruleType === state.typeFilter);
    }
    if (state.domainFilter) {
      result = result.filter((r) => (r.domain || "") === state.domainFilter);
    }

    // Sorting
    if (state.sortField) {
      const field = state.sortField;
      const direction = state.sortDirection === "asc" ? 1 : -1;
      result.sort((a, b) => {
        const aValue = (a[field] || "").toString().toLowerCase();
        const bValue = (b[field] || "").toString().toLowerCase();
        if (aValue < bValue) return -1 * direction;
        if (aValue > bValue) return 1 * direction;
        return 0;
      });
    }

    return result;
  };

  const reset = () => {
    setState({
      typeFilter: null,
      domainFilter: null,
      sortField: null,
      sortDirection: "asc",
    });
  };

  return {
    state,
    setTypeFilter,
    setDomainFilter,
    setSort,
    deriveVisibleRules,
    reset,
  };
}

export const blockRulesStore = createRoot(createBlockRulesStore);

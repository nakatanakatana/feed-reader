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

  return {
    state,
    setTypeFilter,
    setDomainFilter,
    setSort,
  };
}

export const blockRulesStore = createRoot(createBlockRulesStore);

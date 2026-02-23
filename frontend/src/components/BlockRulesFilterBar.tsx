import { For } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { blockRulesStore } from "../lib/block-rules-store";

interface BlockRulesFilterBarProps {
  domains: string[];
}

export function BlockRulesFilterBar(props: BlockRulesFilterBarProps) {
  return (
    <div
      class={flex({
        gap: "4",
        alignItems: "flex-end",
        flexWrap: "wrap",
        width: "full",
        bg: "white",
        p: "4",
        rounded: "md",
        shadow: "sm",
        border: "1px solid",
        borderColor: "gray.200",
      })}
    >
      <div class={stack({ gap: "1" })}>
        <label
          for="filter-type"
          class={css({ fontSize: "sm", fontWeight: "medium" })}
        >
          Filter by Type:
        </label>
        <select
          id="filter-type"
          value={blockRulesStore.state.typeFilter || "ALL_TYPES"}
          onInput={(e) => {
            const val = e.currentTarget.value;
            blockRulesStore.setTypeFilter(val === "ALL_TYPES" ? null : val);
          }}
          class={css({
            border: "1px solid",
            borderColor: "gray.300",
            padding: "2",
            borderRadius: "md",
            bg: "white",
          })}
        >
          <option value="ALL_TYPES">All Types</option>
          <option value="user">User</option>
          <option value="domain">Domain</option>
          <option value="user_domain">User @ Domain</option>
          <option value="keyword">Keyword</option>
        </select>
      </div>

      <div class={stack({ gap: "1", flex: "1", minWidth: "200px" })}>
        <label
          for="filter-domain"
          class={css({ fontSize: "sm", fontWeight: "medium" })}
        >
          Filter by Domain:
        </label>
        <select
          id="filter-domain"
          value={blockRulesStore.state.domainFilter || "ALL_DOMAINS"}
          onInput={(e) => {
            const val = e.currentTarget.value;
            blockRulesStore.setDomainFilter(val === "ALL_DOMAINS" ? null : val);
          }}
          class={css({
            border: "1px solid",
            borderColor: "gray.300",
            padding: "2",
            borderRadius: "md",
            bg: "white",
          })}
        >
          <option value="ALL_DOMAINS">All Domains</option>
          <For each={props.domains}>
            {(domain) => <option value={domain}>{domain}</option>}
          </For>
        </select>
      </div>
    </div>
  );
}

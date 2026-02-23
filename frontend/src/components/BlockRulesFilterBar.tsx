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
      class={css({
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        flexWrap: "wrap",
        columnGap: "4",
        rowGap: "2",
        backgroundColor: "gray.50",
        padding: "2",
        rounded: "md",
        border: "1px solid",
        borderColor: "gray.200",
      })}
    >
      <div class={flex({ gap: "2", alignItems: "center" })}>
        <label
          for="filter-type"
          class={css({ fontSize: "sm", color: "gray.600" })}
        >
          Filter:
        </label>
        <select
          id="filter-type"
          value={blockRulesStore.state.typeFilter || "ALL_TYPES"}
          onInput={(e) => {
            const val = e.currentTarget.value;
            blockRulesStore.setTypeFilter(val === "ALL_TYPES" ? null : val);
          }}
          class={css({
            fontSize: "xs",
            px: "2",
            py: "1.5",
            rounded: "md",
            border: "1px solid",
            borderColor: "gray.300",
            bg: "white",
            minW: "8rem",
          })}
        >
          <option value="ALL_TYPES">All Types</option>
          <option value="user">User</option>
          <option value="domain">Domain</option>
          <option value="user_domain">User @ Domain</option>
          <option value="keyword">Keyword</option>
        </select>
      </div>

      <div class={flex({ gap: "2", alignItems: "center" })}>
        <label
          for="filter-domain"
          class={css({ fontSize: "sm", color: "gray.600" })}
        >
          Domain:
        </label>
        <select
          id="filter-domain"
          value={blockRulesStore.state.domainFilter || "ALL_DOMAINS"}
          onInput={(e) => {
            const val = e.currentTarget.value;
            blockRulesStore.setDomainFilter(val === "ALL_DOMAINS" ? null : val);
          }}
          class={css({
            fontSize: "xs",
            px: "2",
            py: "1.5",
            rounded: "md",
            border: "1px solid",
            borderColor: "gray.300",
            bg: "white",
            minW: "10rem",
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

import { For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { blockRulesStore, type BlockRulesSortField } from "../lib/block-rules-store";
import { ActionButton } from "./ui/ActionButton";

interface Rule {
  id: string;
  ruleType: string;
  value: string;
  domain?: string;
}

interface BlockRulesTableProps {
  rules: Rule[];
  onDelete: (id: string) => void;
  isPending: boolean;
}

export function BlockRulesTable(props: BlockRulesTableProps) {
  const SortIndicator = (params: { field: BlockRulesSortField }) => (
    <Show when={blockRulesStore.state.sortField === params.field}>
      <span class={css({ ml: "1" })}>
        {blockRulesStore.state.sortDirection === "asc" ? "↑" : "↓"}
      </span>
    </Show>
  );

  return (
    <div class={css({ width: "full", overflowX: "auto" })}>
      {/* Mobile Sort Bar */}
      <div
        class={flex({
          display: { base: "flex", md: "none" },
          gap: "2",
          alignItems: "center",
          mb: "3",
          px: "1",
          position: "sticky",
          top: "4rem", // Adjust based on filter bar height
          zIndex: 9,
          backgroundColor: "gray.50",
          py: "2",
        })}
      >
        <label
          for="mobile-sort"
          class={css({ fontSize: "sm", color: "gray.600" })}
        >
          Sort by:
        </label>
        <select
          id="mobile-sort"
          value={blockRulesStore.state.sortField || ""}
          onInput={(e) => {
            const val = e.currentTarget.value as BlockRulesSortField;
            if (val) blockRulesStore.setSort(val);
          }}
          class={css({
            fontSize: "xs",
            px: "2",
            py: "1.5",
            rounded: "md",
            border: "1px solid",
            borderColor: "gray.300",
            bg: "white",
            flex: 1,
          })}
        >
          <option value="">None</option>
          <option value="ruleType">Type</option>
          <option value="value">Value</option>
          <option value="domain">Domain</option>
        </select>
        <Show when={blockRulesStore.state.sortField}>
          <button
            type="button"
            onClick={() => {
              if (blockRulesStore.state.sortField) {
                blockRulesStore.setSort(blockRulesStore.state.sortField);
              }
            }}
            class={css({
              fontSize: "xs",
              px: "3",
              py: "1.5",
              rounded: "md",
              border: "1px solid",
              borderColor: "gray.300",
              bg: "white",
              cursor: "pointer",
            })}
          >
            {blockRulesStore.state.sortDirection === "asc" ? "Asc ↑" : "Desc ↓"}
          </button>
        </Show>
      </div>

      {/* Desktop Table View */}
      <table
        class={css({
          width: "full",
          display: { base: "none", md: "table" },
          borderCollapse: "collapse",
          "& th, & td": {
            textAlign: "left",
            p: "3",
            borderBottom: "1px solid",
            borderColor: "gray.100",
          },
        })}
      >
        <thead>
          <tr class={css({ bg: "gray.50" })}>
            <th
              onClick={() => blockRulesStore.setSort("ruleType")}
              class={css({
                cursor: "pointer",
                _hover: { bg: "gray.100" },
                whiteSpace: "nowrap",
              })}
            >
              <button type="button" class={css({ bg: "transparent", border: "none", cursor: "inherit", fontWeight: "inherit", p: 0 })}>
                Type <SortIndicator field="ruleType" />
              </button>
            </th>
            <th
              onClick={() => blockRulesStore.setSort("value")}
              class={css({
                cursor: "pointer",
                _hover: { bg: "gray.100" },
                whiteSpace: "nowrap",
              })}
            >
              <button type="button" class={css({ bg: "transparent", border: "none", cursor: "inherit", fontWeight: "inherit", p: 0 })}>
                Value <SortIndicator field="value" />
              </button>
            </th>
            <th
              onClick={() => blockRulesStore.setSort("domain")}
              class={css({
                cursor: "pointer",
                _hover: { bg: "gray.100" },
                whiteSpace: "nowrap",
              })}
            >
              <button type="button" class={css({ bg: "transparent", border: "none", cursor: "inherit", fontWeight: "inherit", p: 0 })}>
                Domain <SortIndicator field="domain" />
              </button>
            </th>
            <th class={css({ textAlign: "right!", whiteSpace: "nowrap" })}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <For each={props.rules}>
            {(rule) => (
              <tr class={css({ _hover: { bg: "gray.50" } })}>
                <td>
                  <span
                    class={css({
                      fontSize: "xs",
                      bg: "gray.100",
                      px: "2",
                      py: "0.5",
                      rounded: "full",
                    })}
                  >
                    {rule.ruleType}
                  </span>
                </td>
                <td class={css({ fontWeight: "bold" })}>{rule.value}</td>
                <td>
                  <Show when={rule.domain}>
                    <code
                      class={css({
                        fontSize: "sm",
                        color: "gray.600",
                        bg: "gray.50",
                        px: "1",
                        rounded: "sm",
                      })}
                    >
                      @{rule.domain}
                    </code>
                  </Show>
                </td>
                <td class={css({ textAlign: "right!" })}>
                  <ActionButton
                    variant="danger"
                    size="sm"
                    onClick={() => props.onDelete(rule.id)}
                    disabled={props.isPending}
                  >
                    Delete
                  </ActionButton>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      {/* Mobile List View */}
      <div class={css({ display: "block", md: "none" })}>
        <ul class={stack({ gap: "3" })}>
          <For each={props.rules}>
            {(rule) => (
              <li
                class={flex({
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: "3",
                  border: "1px solid",
                  borderColor: "gray.100",
                  rounded: "md",
                })}
              >
                <div class={stack({ gap: "1" })}>
                  <div class={flex({ gap: "2", alignItems: "center" })}>
                    <span
                      class={css({
                        fontSize: "xs",
                        bg: "gray.100",
                        px: "2",
                        py: "0.5",
                        rounded: "full",
                      })}
                    >
                      {rule.ruleType}
                    </span>
                    <span class={css({ fontWeight: "bold" })}>{rule.value}</span>
                  </div>
                  <Show when={rule.domain}>
                    <code
                      class={css({
                        fontSize: "sm",
                        color: "gray.600",
                        bg: "gray.50",
                        px: "1",
                        rounded: "sm",
                      })}
                    >
                      @{rule.domain}
                    </code>
                  </Show>
                </div>
                <ActionButton
                  variant="danger"
                  size="sm"
                  onClick={() => props.onDelete(rule.id)}
                  disabled={props.isPending}
                >
                  Delete
                </ActionButton>
              </li>
            )}
          </For>
        </ul>
      </div>
    </div>
  );
}

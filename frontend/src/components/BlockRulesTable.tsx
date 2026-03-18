import { For, Show } from "solid-js";

import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { createMediaQuery } from "../lib/use-media-query";
import type { BlockRulesSortField } from "../routes/block-rules";
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
  sortField: BlockRulesSortField | null;
  sortDirection: "asc" | "desc";
  onSort: (field: BlockRulesSortField | null) => void;
}

export function BlockRulesTable(props: BlockRulesTableProps) {
  const isMobile = createMediaQuery("(max-width: 767px)");

  const SortIndicator = (params: { field: BlockRulesSortField }) => (
    <Show when={props.sortField === params.field}>
      <span class={css({ ml: "1" })}>{props.sortDirection === "asc" ? "↑" : "↓"}</span>
    </Show>
  );

  return (
    <div class={css({ width: "full", overflowX: "auto" })}>
      <Show
        when={isMobile()}
        fallback={
          /* Desktop Table View */
          <table
            class={css({
              width: "full",
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
                  aria-sort={
                    props.sortField === "ruleType"
                      ? props.sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  class={css({
                    cursor: "pointer",
                    _hover: { bg: "gray.100" },
                    whiteSpace: "nowrap",
                  })}
                >
                  <button
                    type="button"
                    onClick={() => props.onSort("ruleType")}
                    class={css({
                      bg: "transparent",
                      border: "none",
                      cursor: "inherit",
                      fontWeight: "inherit",
                      p: 0,
                    })}
                  >
                    Type <SortIndicator field="ruleType" />
                  </button>
                </th>
                <th
                  aria-sort={
                    props.sortField === "value"
                      ? props.sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  class={css({
                    cursor: "pointer",
                    _hover: { bg: "gray.100" },
                    whiteSpace: "nowrap",
                  })}
                >
                  <button
                    type="button"
                    onClick={() => props.onSort("value")}
                    class={css({
                      bg: "transparent",
                      border: "none",
                      cursor: "inherit",
                      fontWeight: "inherit",
                      p: 0,
                    })}
                  >
                    Value <SortIndicator field="value" />
                  </button>
                </th>
                <th
                  aria-sort={
                    props.sortField === "domain"
                      ? props.sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  class={css({
                    cursor: "pointer",
                    _hover: { bg: "gray.100" },
                    whiteSpace: "nowrap",
                  })}
                >
                  <button
                    type="button"
                    onClick={() => props.onSort("domain")}
                    class={css({
                      bg: "transparent",
                      border: "none",
                      cursor: "inherit",
                      fontWeight: "inherit",
                      p: 0,
                    })}
                  >
                    Domain <SortIndicator field="domain" />
                  </button>
                </th>
                <th class={css({ textAlign: "right!", whiteSpace: "nowrap" })}>Actions</th>
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
        }
      >
        {/* Mobile Sort Bar */}
        <div
          class={flex({
            gap: "2",
            alignItems: "center",
            mb: "3",
            px: "1",
            position: "sticky",
            top: 0,
            zIndex: 9,
            backgroundColor: "gray.50",
            py: "2",
          })}
        >
          <label for="mobile-sort" class={css({ fontSize: "sm", color: "gray.600" })}>
            Sort by:
          </label>
          <select
            id="mobile-sort"
            value={props.sortField || ""}
            onInput={(e) => {
              const val = e.currentTarget.value as BlockRulesSortField | "";
              props.onSort(val === "" ? null : val);
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
          <Show when={props.sortField}>
            <button
              type="button"
              onClick={() => {
                if (props.sortField) {
                  props.onSort(props.sortField);
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
              {props.sortDirection === "asc" ? "Asc ↑" : "Desc ↓"}
            </button>
          </Show>
        </div>

        {/* Mobile List View */}
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
      </Show>
    </div>
  );
}

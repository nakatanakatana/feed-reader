import { useLiveQuery } from "@tanstack/solid-db";
import { createMutation } from "@tanstack/solid-query";
import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { ActionButton } from "../components/ui/ActionButton";
import { PageLayout } from "../components/ui/PageLayout";
import { urlParsingRuleDelete, urlParsingRuleInsert, urlParsingRules } from "../lib/block-db";

export const Route = createFileRoute("/url-rules")({
  component: URLRulesComponent,
});

function URLRulesComponent() {
  const [domain, setDomain] = createSignal("");
  const [ruleType, setRuleType] = createSignal("subdomain");
  const [pattern, setPattern] = createSignal("");

  const rulesQuery = useLiveQuery((q) =>
    q.from({ rule: urlParsingRules }).select(({ rule }) => ({ ...rule })),
  );

  const addMutation = createMutation(() => ({
    mutationFn: async (newRule: { domain: string; ruleType: string; pattern: string }) => {
      await urlParsingRuleInsert(newRule.domain, newRule.ruleType, newRule.pattern);
    },
    onSuccess: () => {
      setDomain("");
      setPattern("");
    },
  }));

  const deleteMutation = createMutation(() => ({
    mutationFn: async (id: string) => {
      await urlParsingRuleDelete(id);
    },
  }));

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!domain() || !pattern()) return;
    addMutation.mutate({
      domain: domain(),
      ruleType: ruleType(),
      pattern: pattern(),
    });
  };

  const PlusIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <title>Add</title>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );

  return (
    <PageLayout>
      <div class={stack({ gap: "4", flex: "1", minHeight: 0 })}>
        <div class={flex({ flexDirection: "column", gap: "2", width: "full" })}>
          <form
            onSubmit={handleSubmit}
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
            <div class={stack({ gap: "1", flex: "1", minWidth: "200px" })}>
              <label for="domain" class={css({ fontSize: "sm", fontWeight: "medium" })}>
                Domain
              </label>
              <input
                id="domain"
                type="text"
                placeholder="example.com"
                value={domain()}
                onInput={(e) => setDomain(e.currentTarget.value)}
                class={css({
                  border: "1px solid",
                  borderColor: "gray.300",
                  padding: "2",
                  borderRadius: "md",
                })}
              />
            </div>
            <div class={stack({ gap: "1" })}>
              <label for="rule-type" class={css({ fontSize: "sm", fontWeight: "medium" })}>
                Type
              </label>
              <select
                id="rule-type"
                value={ruleType()}
                onInput={(e) => setRuleType(e.currentTarget.value)}
                class={css({
                  border: "1px solid",
                  borderColor: "gray.300",
                  padding: "2",
                  borderRadius: "md",
                  bg: "white",
                })}
              >
                <option value="subdomain">Subdomain</option>
                <option value="path">Path</option>
              </select>
            </div>
            <div class={stack({ gap: "1", flex: "1", minWidth: "200px" })}>
              <label for="pattern" class={css({ fontSize: "sm", fontWeight: "medium" })}>
                Pattern
              </label>
              <input
                id="pattern"
                type="text"
                placeholder="Pattern"
                value={pattern()}
                onInput={(e) => setPattern(e.currentTarget.value)}
                class={css({
                  border: "1px solid",
                  borderColor: "gray.300",
                  padding: "2",
                  borderRadius: "md",
                })}
              />
            </div>
            <ActionButton
              type="submit"
              variant="primary"
              disabled={addMutation.isPending}
              icon={<PlusIcon />}
            >
              {addMutation.isPending ? "Adding..." : "Add"}
            </ActionButton>
          </form>
        </div>

        <div
          class={css({
            flex: "1",
            minHeight: 0,
            overflowY: "auto",
            backgroundColor: "white",
            rounded: "md",
            shadow: "sm",
            border: "1px solid",
            borderColor: "gray.200",
            p: "4",
          })}
        >
          <Show when={rulesQuery.isLoading}>
            <p>Loading rules...</p>
          </Show>
          <ul class={stack({ gap: "3" })}>
            <For each={rulesQuery()}>
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
                      <span class={css({ fontWeight: "bold" })}>{rule.domain}</span>
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
                    </div>
                    <code
                      class={css({
                        fontSize: "sm",
                        color: "gray.600",
                        bg: "gray.50",
                        px: "1",
                        rounded: "sm",
                      })}
                    >
                      {rule.pattern}
                    </code>
                  </div>
                  <ActionButton
                    variant="danger"
                    size="sm"
                    onClick={() => deleteMutation.mutate(rule.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </ActionButton>
                </li>
              )}
            </For>
          </ul>
        </div>
      </div>
    </PageLayout>
  );
}

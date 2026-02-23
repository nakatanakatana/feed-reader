import { createMutation, createQuery } from "@tanstack/solid-query";
import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { ActionButton } from "../components/ui/ActionButton";
import { PageLayout } from "../components/ui/PageLayout";
import { itemClient } from "../lib/api/client";
import { queryClient } from "../lib/query";

export const Route = createFileRoute("/block-rules")({
  component: BlockRulesComponent,
});

function BlockRulesComponent() {
  const [ruleType, setRuleType] = createSignal("user");
  const [value, setValue] = createSignal("");
  const [domain, setDomain] = createSignal("");

  const rulesQuery = createQuery(() => ({
    queryKey: ["block-rules"],
    queryFn: async () => {
      const resp = await itemClient.listItemBlockRules({});
      return resp.rules;
    },
  }));

  const addMutation = createMutation(() => ({
    mutationFn: async (newRule: {
      ruleType: string;
      value: string;
      domain?: string;
    }) => {
      await itemClient.addItemBlockRules({
        rules: [newRule],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["block-rules"] });
      setValue("");
      setDomain("");
    },
  }));

  const deleteMutation = createMutation(() => ({
    mutationFn: async (id: string) => {
      await itemClient.deleteItemBlockRule({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["block-rules"] });
    },
  }));

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!value()) return;

    // Domain is required for user_domain and domain rule types
    if (
      (ruleType() === "user_domain" || ruleType() === "domain") &&
      !domain()
    ) {
      return;
    }

    addMutation.mutate({
      ruleType: ruleType(),
      value: value(),
      domain: domain() || undefined,
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
            <div class={stack({ gap: "1" })}>
              <label
                for="rule-type"
                class={css({ fontSize: "sm", fontWeight: "medium" })}
              >
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
                <option value="user">User</option>
                <option value="domain">Domain</option>
                <option value="user_domain">User @ Domain</option>
                <option value="keyword">Keyword</option>
              </select>
            </div>
            <div class={stack({ gap: "1", flex: "1", minWidth: "200px" })}>
              <label
                for="value"
                class={css({ fontSize: "sm", fontWeight: "medium" })}
              >
                Value
              </label>
              <input
                id="value"
                type="text"
                placeholder="Value to block"
                value={value()}
                onInput={(e) => setValue(e.currentTarget.value)}
                class={css({
                  border: "1px solid",
                  borderColor: "gray.300",
                  padding: "2",
                  borderRadius: "md",
                })}
              />
            </div>
            <div class={stack({ gap: "1", flex: "1", minWidth: "200px" })}>
              <label
                for="domain"
                class={css({ fontSize: "sm", fontWeight: "medium" })}
              >
                Domain (Optional)
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
            <For each={rulesQuery.data}>
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
                      <span class={css({ fontWeight: "bold" })}>
                        {rule.value}
                      </span>
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

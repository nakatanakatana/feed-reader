import { eq, useLiveQuery } from "@tanstack/solid-db";
import { createMutation } from "@tanstack/solid-query";
import { createFileRoute } from "@tanstack/solid-router";
import { createMemo, createSignal, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { BlockRulesFilterBar } from "../components/BlockRulesFilterBar";
import { BlockRulesTable } from "../components/BlockRulesTable";
import { BulkAddBlockRulesModal } from "../components/BulkAddBlockRulesModal";
import { ActionButton } from "../components/ui/ActionButton";
import { PageLayout } from "../components/ui/PageLayout";
import { itemBlockRules } from "../lib/block-db";

export type BlockRulesSortField = "ruleType" | "value" | "domain";

export const Route = createFileRoute("/block-rules")({
  component: BlockRulesComponent,
});

function BlockRulesComponent() {
  const [ruleType, setRuleType] = createSignal("user");
  const [value, setValue] = createSignal("");
  const [domain, setDomain] = createSignal("");
  const [isBulkModalOpen, setIsBulkModalOpen] = createSignal(false);

  // Filter/Sort Signals
  const [typeFilter, setTypeFilter] = createSignal<string | null>(null);
  const [domainFilter, setDomainFilter] = createSignal<string | null>(null);
  const [sortField, setSortField] = createSignal<BlockRulesSortField | null>(
    null,
  );
  const [sortDirection, setSortDirection] = createSignal<"asc" | "desc">("asc");

  const rulesQuery = useLiveQuery((q) => {
    let query = q.from({ rule: itemBlockRules });

    const currentTypeFilter = typeFilter();
    if (currentTypeFilter) {
      query = query.where(({ rule }) => eq(rule.ruleType, currentTypeFilter));
    }

    const currentDomainFilter = domainFilter();
    if (currentDomainFilter) {
      query = query.where(({ rule }) =>
        eq(rule.domain || "", currentDomainFilter),
      );
    }

    const currentSortField = sortField();
    if (currentSortField) {
      query = query.orderBy(
        ({ rule }) => rule[currentSortField] || "",
        sortDirection(),
      );
    }

    return query.select(({ rule }) => ({ ...rule }));
  });

  // Separate query for unique domains to ensure the filter dropdown always shows all options
  const allRulesForDomains = useLiveQuery((q) =>
    q
      .from({ rule: itemBlockRules })
      .select(({ rule }) => ({ domain: rule.domain })),
  );

  const memoizedUniqueDomains = createMemo(() => {
    const rules = allRulesForDomains() || [];
    const domains = new Set<string>();
    for (const rule of rules) {
      if (rule.domain) domains.add(rule.domain);
    }
    return Array.from(domains).sort();
  });

  const toggleSort = (field: BlockRulesSortField | null) => {
    if (field === null) {
      setSortField(null);
      setSortDirection("asc");
      return;
    }

    if (sortField() === field) {
      setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const addMutation = createMutation(() => ({
    mutationFn: async (newRule: {
      ruleType: string;
      value: string;
      domain?: string;
    }) => {
      const tx = itemBlockRules.insert({
        id: `temp-${crypto.randomUUID()}`,
        ...newRule,
        // biome-ignore lint/suspicious/noExplicitAny: using any for partial rule insert
      } as any);
      await tx.isPersisted.promise;
    },
    onSuccess: () => {
      setValue("");
      setDomain("");
    },
  }));

  const bulkAddMutation = createMutation(() => ({
    mutationFn: async (
      rules: { ruleType: string; value: string; domain?: string }[],
    ) => {
      const rulesToInsert = rules.map((r) => ({
        id: `temp-${crypto.randomUUID()}`,
        ...r,
      }));
      // biome-ignore lint/suspicious/noExplicitAny: using any for bulk insert
      const tx = itemBlockRules.insert(rulesToInsert as any);
      await tx.isPersisted.promise;
    },
  }));

  const deleteMutation = createMutation(() => ({
    mutationFn: async (id: string) => {
      await itemBlockRules.delete(id);
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
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );

  const UploadIcon = () => (
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
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
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
            <div class={flex({ gap: "2" })}>
              <ActionButton
                type="submit"
                variant="primary"
                disabled={addMutation.isPending}
                icon={<PlusIcon />}
              >
                {addMutation.isPending ? "Adding..." : "Add"}
              </ActionButton>
              <ActionButton
                type="button"
                variant="secondary"
                icon={<UploadIcon />}
                onClick={() => setIsBulkModalOpen(true)}
              >
                Bulk Add
              </ActionButton>
            </div>
          </form>
        </div>

        <BulkAddBlockRulesModal
          isOpen={isBulkModalOpen()}
          onClose={() => setIsBulkModalOpen(false)}
          onRegister={async (rules) => {
            await bulkAddMutation.mutateAsync(rules);
          }}
          isPending={bulkAddMutation.isPending}
        />

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
          })}
        >
          <Show when={rulesQuery.isLoading}>
            <p>Loading rules...</p>
          </Show>
          <BlockRulesFilterBar
            domains={memoizedUniqueDomains()}
            typeFilter={typeFilter()}
            setTypeFilter={setTypeFilter}
            domainFilter={domainFilter()}
            setDomainFilter={setDomainFilter}
          />

          <BlockRulesTable
            rules={rulesQuery() || []}
            onDelete={(id) => deleteMutation.mutate(id)}
            isPending={deleteMutation.isPending}
            sortField={sortField()}
            sortDirection={sortDirection()}
            onSort={toggleSort}
          />
        </div>
      </div>
    </PageLayout>
  );
}

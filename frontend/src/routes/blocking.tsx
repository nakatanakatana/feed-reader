import { useLiveQuery } from "@tanstack/solid-db";
import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { AddBlockingRuleForm } from "../components/AddBlockingRuleForm";
import { BulkImportBlockingRuleForm } from "../components/BulkImportBlockingRuleForm";
import { ActionButton } from "../components/ui/ActionButton";
import { PageLayout } from "../components/ui/PageLayout";
import {
  blockingRules,
  deleteBlockingRule,
  reevaluateAllItems,
  urlParsingRules,
  createURLParsingRule,
  deleteURLParsingRule,
} from "../lib/blocking-db";

export const Route = createFileRoute("/blocking")({
  component: BlockingComponent,
});

function BlockingComponent() {
  const rules = useLiveQuery((q) => q.from({ rule: urlParsingRules }));
  const blocks = useLiveQuery((q) => q.from({ block: blockingRules }));

  const [domain, setDomain] = createSignal("");
  const [pattern, setPattern] = createSignal("");

  const handleAddUrlRule = async (e: Event) => {
    e.preventDefault();
    if (!domain() || !pattern()) return;
    await createURLParsingRule({ domain: domain(), pattern: pattern() });
    setDomain("");
    setPattern("");
  };

  const sectionStyle = css({
    backgroundColor: "white",
    padding: { base: "4", md: "6" },
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "gray.200",
    boxShadow: "sm",
  });

  const headingStyle = css({
    fontSize: "lg",
    fontWeight: "bold",
    marginBottom: "4",
    color: "gray.900",
  });

  const inputStyle = css({
    paddingX: "3",
    paddingY: "2",
    borderRadius: "md",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "gray.300",
    width: "full",
    fontSize: "sm",
    _focus: {
      outline: "none",
      borderColor: "blue.500",
      boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.2)",
    },
  });

  const cardStyle = flex({
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4",
    border: "1px solid",
    borderColor: "gray.100",
    borderRadius: "md",
    gap: "3",
    bg: "white",
    _hover: { backgroundColor: "gray.50" },
  });

  return (
    <PageLayout>
      <div
        class={stack({
          gap: "8",
          maxWidth: "4xl",
          margin: "auto",
          width: "full",
          paddingY: "4",
        })}
      >
        {/* Re-evaluation Trigger */}
        <div class={flex({ justifyContent: "flex-end" })}>
          <ActionButton
            onClick={() => reevaluateAllItems()}
            variant="secondary"
          >
            Re-evaluate All Items
          </ActionButton>
        </div>

        <AddBlockingRuleForm />
        <BulkImportBlockingRuleForm />

        {/* URL Parsing Rules Section */}
        <section class={sectionStyle}>
          <h2 class={headingStyle}>Domain URL Parsing Rules</h2>
          <form onSubmit={handleAddUrlRule} class={stack({ gap: "4" })}>
            <div class={flex({ gap: "4", flexDirection: { base: "column", md: "row" } })}>
              <div class={css({ flex: "1" })}>
                <label
                  for="url-domain"
                  class={css({
                    display: "block",
                    fontSize: "xs",
                    fontWeight: "bold",
                    marginBottom: "1",
                    color: "gray.500",
                  })}
                >
                  Domain
                </label>
                <input
                  id="url-domain"
                  type="text"
                  placeholder="e.g. example.com"
                  value={domain()}
                  onInput={(e) => setDomain(e.currentTarget.value)}
                  class={inputStyle}
                />
              </div>
              <div class={css({ flex: "2" })}>
                <label
                  for="url-pattern"
                  class={css({
                    display: "block",
                    fontSize: "xs",
                    fontWeight: "bold",
                    marginBottom: "1",
                    color: "gray.500",
                  })}
                >
                  Regex Pattern (first group is username)
                </label>
                <input
                  id="url-pattern"
                  type="text"
                  placeholder="^https://example\.com/users/([^/]+)"
                  value={pattern()}
                  onInput={(e) => setPattern(e.currentTarget.value)}
                  class={inputStyle}
                />
              </div>
              <div class={css({ display: "flex", alignItems: "flex-end" })}>
                <ActionButton type="submit" variant="primary">
                  Add Parsing Rule
                </ActionButton>
              </div>
            </div>
          </form>

          <div class={stack({ gap: "2", marginTop: "6" })}>
            <For each={rules()}>
              {(rule) => (
                <div class={cardStyle}>
                  <div class={stack({ gap: "1" })}>
                    <div class={css({ fontWeight: "bold", fontSize: "sm" })}>{rule.domain}</div>
                    <div class={css({ fontSize: "xs", color: "gray.600", fontFamily: "mono" })}>
                      {rule.pattern}
                    </div>
                  </div>
                  <ActionButton
                    variant="ghost"
                    onClick={() => deleteURLParsingRule(rule.id)}
                  >
                    Delete
                  </ActionButton>
                </div>
              )}
            </For>
          </div>
        </section>

        {/* Existing Blocking Rules Section */}
        <section class={sectionStyle}>
          <h2 class={headingStyle}>Existing Blocking Rules</h2>
          <div class={stack({ gap: "2" })}>
            <For each={blocks()}>
              {(block) => (
                <div class={cardStyle}>
                  <div class={stack({ gap: "1" })}>
                    <div class={css({ fontSize: "xs", fontWeight: "bold", color: "blue.600", textTransform: "uppercase" })}>
                      {block.ruleType.replace("_", " ")}
                    </div>
                    <div class={css({ fontSize: "sm", color: "gray.800" })}>
                      {block.ruleType === "user_domain" ? (
                        <>
                          {block.username && (
                            <span>
                              User: <strong>{block.username}</strong>{" "}
                            </span>
                          )}
                          {block.domain && (
                            <span>
                              Domain: <strong>{block.domain}</strong>
                            </span>
                          )}
                        </>
                      ) : (
                        <span>
                          Keyword: <strong>{block.keyword}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                  <ActionButton
                    variant="ghost"
                    onClick={() => deleteBlockingRule(block.id)}
                  >
                    Delete
                  </ActionButton>
                </div>
              )}
            </For>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

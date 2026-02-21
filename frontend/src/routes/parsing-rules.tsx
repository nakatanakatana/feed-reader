import { useLiveQuery } from "@tanstack/solid-db";
import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { ActionButton } from "../components/ui/ActionButton";
import { PageLayout } from "../components/ui/PageLayout";
import {
  createURLParsingRule,
  deleteURLParsingRule,
  urlParsingRules,
} from "../lib/blocking-db";

export const Route = createFileRoute("/parsing-rules")({
  component: ParsingRulesComponent,
});

function ParsingRulesComponent() {
  const rules = useLiveQuery((q) => q.from({ rule: urlParsingRules }));

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
    padding: "6",
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

  const inputStyleConfig = {
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
  };

  const inputStyle = css(inputStyleConfig);

  const tableStyle = css({
    width: "full",
    borderCollapse: "collapse",
    marginTop: "4",
    fontSize: "sm",
  });

  const thStyle = css({
    textAlign: "left",
    padding: "3",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "gray.200",
    fontWeight: "semibold",
    color: "gray.600",
  });

  const tdStyle = css({
    padding: "3",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "gray.50",
    color: "gray.800",
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
        {/* URL Parsing Rules Section */}
        <section class={sectionStyle}>
          <h2 class={headingStyle}>Domain URL Parsing Rules</h2>
          <form onSubmit={handleAddUrlRule} class={stack({ gap: "4" })}>
            <div class={flex({ gap: "4" })}>
              <div class={css({ flex: "1" })}>
                <label
                  for="parsing-domain"
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
                  id="parsing-domain"
                  type="text"
                  placeholder="e.g. example.com"
                  value={domain()}
                  onInput={(e) => setDomain(e.currentTarget.value)}
                  class={inputStyle}
                />
              </div>
              <div class={css({ flex: "2" })}>
                <label
                  for="parsing-pattern"
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
                  id="parsing-pattern"
                  type="text"
                  placeholder="^https://example\.com/users/([^/]+)"
                  value={pattern()}
                  onInput={(e) => setPattern(e.currentTarget.value)}
                  class={inputStyle}
                />
              </div>
              <div class={css({ display: "flex", alignItems: "flex-end" })}>
                <ActionButton type="submit" variant="primary">
                  Add Rule
                </ActionButton>
              </div>
            </div>
          </form>

          <table class={tableStyle}>
            <thead>
              <tr>
                <th class={thStyle}>Domain</th>
                <th class={thStyle}>Pattern</th>
                <th class={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <For each={rules()}>
                {(rule) => (
                  <tr>
                    <td class={tdStyle}>{rule.domain}</td>
                    <td class={tdStyle}>
                      <code>{rule.pattern}</code>
                    </td>
                    <td class={tdStyle}>
                      <ActionButton
                        variant="ghost"
                        onClick={() => deleteURLParsingRule(rule.id)}
                      >
                        Delete
                      </ActionButton>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </section>
      </div>
    </PageLayout>
  );
}

import { useLiveQuery } from "@tanstack/solid-db";
import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { ActionButton } from "../components/ui/ActionButton";
import { PageLayout } from "../components/ui/PageLayout";
import {
  blockingRules,
  bulkCreateBlockingRules,
  createBlockingRule,
  createURLParsingRule,
  deleteBlockingRule,
  deleteURLParsingRule,
  reevaluateAllItems,
  urlParsingRules,
} from "../lib/blocking-db";

export const Route = createFileRoute("/blocking")({
  component: BlockingComponent,
});

function BlockingComponent() {
  const rules = useLiveQuery((q) => q.from({ rule: urlParsingRules }));
  const blocks = useLiveQuery((q) => q.from({ block: blockingRules }));

  const [domain, setDomain] = createSignal("");
  const [pattern, setPattern] = createSignal("");

  const [blockType, setBlockType] = createSignal("user_domain");
  const [blockUsername, setBlockUsername] = createSignal("");
  const [blockDomain, setBlockDomain] = createSignal("");
  const [blockKeyword, setBlockKeyword] = createSignal("");

  const [bulkInput, setBulkInput] = createSignal("");

  const handleAddUrlRule = async (e: Event) => {
    e.preventDefault();
    if (!domain() || !pattern()) return;
    await createURLParsingRule({ domain: domain(), pattern: pattern() });
    setDomain("");
    setPattern("");
  };

  const handleAddBlockingRule = async (e: Event) => {
    e.preventDefault();
    const type = blockType();
    if (type === "user_domain") {
      if (!blockUsername() && !blockDomain()) return;
      await createBlockingRule({
        ruleType: type,
        username: blockUsername() || undefined,
        domain: blockDomain() || undefined,
      });
    } else {
      if (!blockKeyword()) return;
      await createBlockingRule({
        ruleType: type,
        keyword: blockKeyword(),
      });
    }
    setBlockUsername("");
    setBlockDomain("");
    setBlockKeyword("");
  };

  const handleBulkImport = async (e: Event) => {
    e.preventDefault();
    const input = bulkInput().trim();
    if (!input) return;

    const lines = input.split("\n");
    const rulesToCreate = lines
      .map((line) => {
        const [ruleType, username, domain, keyword] = line
          .split(",")
          .map((s) => s.trim());
        if (!ruleType) return null;

        if (ruleType === "user_domain") {
          if (!username && !domain) return null;
          return {
            ruleType,
            username: username || undefined,
            domain: domain || undefined,
          };
        }
        if (ruleType === "keyword") {
          if (!keyword) return null;
          return {
            ruleType,
            keyword,
          };
        }
        return null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rulesToCreate.length > 0) {
      await bulkCreateBlockingRules(rulesToCreate);
      setBulkInput("");
    }
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
        {/* Re-evaluation Trigger */}
        <div class={flex({ justifyContent: "flex-end" })}>
          <ActionButton
            onClick={() => reevaluateAllItems()}
            variant="secondary"
          >
            Re-evaluate All Items
          </ActionButton>
        </div>

        {/* URL Parsing Rules Section */}
        <section class={sectionStyle}>
          <h2 class={headingStyle}>Domain URL Parsing Rules</h2>
          <form onSubmit={handleAddUrlRule} class={stack({ gap: "4" })}>
            <div class={flex({ gap: "4" })}>
              <div class={css({ flex: "1" })}>
                <label
                  class={css({
                    display: "block",
                    fontSize: "xs",
                    fontWeight: "bold",
                    marginBottom: "1",
                    color: "gray.500",
                  })}
                >
                  Domain
                  <input
                    type="text"
                    placeholder="e.g. example.com"
                    value={domain()}
                    onInput={(e) => setDomain(e.currentTarget.value)}
                    class={inputStyle}
                  />
                </label>
              </div>
              <div class={css({ flex: "2" })}>
                <label
                  class={css({
                    display: "block",
                    fontSize: "xs",
                    fontWeight: "bold",
                    marginBottom: "1",
                    color: "gray.500",
                  })}
                >
                  Regex Pattern (first group is username)
                  <input
                    type="text"
                    placeholder="^https://example\.com/users/([^/]+)"
                    value={pattern()}
                    onInput={(e) => setPattern(e.currentTarget.value)}
                    class={inputStyle}
                  />
                </label>
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

        {/* Bulk Import Section */}
        <section class={sectionStyle}>
          <h2 class={headingStyle}>Bulk Import Blocking Rules</h2>
          <form onSubmit={handleBulkImport} class={stack({ gap: "4" })}>
            <div>
              <p
                class={css({
                  fontSize: "xs",
                  color: "gray.500",
                  marginBottom: "2",
                })}
              >
                Format: <code>rule_type,username,domain,keyword</code> (one per
                line).
                <br />
                Example: <code>user_domain,,spam.com,</code> or{" "}
                <code>keyword,,,badword</code>
              </p>
              <textarea
                placeholder="user_domain,,spam.com,&#10;keyword,,,badword"
                value={bulkInput()}
                onInput={(e) => setBulkInput(e.currentTarget.value)}
                class={css(inputStyleConfig, {
                  minHeight: "100px",
                  fontFamily: "mono",
                })}
              />
            </div>
            <div class={flex({ justifyContent: "flex-end" })}>
              <ActionButton
                type="submit"
                variant="primary"
                disabled={!bulkInput().trim()}
              >
                Import Rules
              </ActionButton>
            </div>
          </form>
        </section>

        {/* Blocking Rules Section */}
        <section class={sectionStyle}>
          <h2 class={headingStyle}>Blocking Rules</h2>
          <form onSubmit={handleAddBlockingRule} class={stack({ gap: "4" })}>
            <div class={stack({ gap: "4" })}>
              <div class={flex({ gap: "4" })}>
                <div class={css({ flex: "1" })}>
                  <label
                    class={css({
                      display: "block",
                      fontSize: "xs",
                      fontWeight: "bold",
                      marginBottom: "1",
                      color: "gray.500",
                    })}
                  >
                    Rule Type
                    <select
                      value={blockType()}
                      onChange={(e) => setBlockType(e.currentTarget.value)}
                      class={inputStyle}
                    >
                      <option value="user_domain">User/Domain Block</option>
                      <option value="keyword">Keyword Block</option>
                    </select>
                  </label>
                </div>

                {blockType() === "user_domain" ? (
                  <>
                    <div class={css({ flex: "1" })}>
                      <label
                        class={css({
                          display: "block",
                          fontSize: "xs",
                          fontWeight: "bold",
                          marginBottom: "1",
                          color: "gray.500",
                        })}
                      >
                        Username (Optional)
                        <input
                          type="text"
                          placeholder="spammer"
                          value={blockUsername()}
                          onInput={(e) =>
                            setBlockUsername(e.currentTarget.value)
                          }
                          class={inputStyle}
                        />
                      </label>
                    </div>
                    <div class={css({ flex: "1" })}>
                      <label
                        class={css({
                          display: "block",
                          fontSize: "xs",
                          fontWeight: "bold",
                          marginBottom: "1",
                          color: "gray.500",
                        })}
                      >
                        Domain (Optional)
                        <input
                          type="text"
                          placeholder="example.com"
                          value={blockDomain()}
                          onInput={(e) => setBlockDomain(e.currentTarget.value)}
                          class={inputStyle}
                        />
                      </label>
                    </div>
                  </>
                ) : (
                  <div class={css({ flex: "2" })}>
                    <label
                      class={css({
                        display: "block",
                        fontSize: "xs",
                        fontWeight: "bold",
                        marginBottom: "1",
                        color: "gray.500",
                      })}
                    >
                      Keyword
                      <input
                        type="text"
                        placeholder="SPAM"
                        value={blockKeyword()}
                        onInput={(e) => setBlockKeyword(e.currentTarget.value)}
                        class={inputStyle}
                      />
                    </label>
                  </div>
                )}

                <div class={css({ display: "flex", alignItems: "flex-end" })}>
                  <ActionButton type="submit" variant="primary">
                    Add Rule
                  </ActionButton>
                </div>
              </div>
            </div>
          </form>

          <table class={tableStyle}>
            <thead>
              <tr>
                <th class={thStyle}>Type</th>
                <th class={thStyle}>Details</th>
                <th class={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <For each={blocks()}>
                {(block) => (
                  <tr>
                    <td class={tdStyle}>{block.ruleType}</td>
                    <td class={tdStyle}>
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
                    </td>
                    <td class={tdStyle}>
                      <ActionButton
                        variant="ghost"
                        onClick={() => deleteBlockingRule(block.id)}
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

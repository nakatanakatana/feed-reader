import { createSignal } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { bulkCreateBlockingRules, parseBulkBlockingRules } from "../lib/blocking-db";
import { ActionButton } from "./ui/ActionButton";

export function BulkImportBlockingRuleForm() {
  const [bulkInput, setBulkInput] = createSignal("");

  const handleBulkImport = async (e: Event) => {
    e.preventDefault();
    const input = bulkInput().trim();
    if (!input) return;

    const rulesToCreate = parseBulkBlockingRules(input);

    if (rulesToCreate.length > 0) {
      await bulkCreateBlockingRules(rulesToCreate);
      setBulkInput("");
    }
  };

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

  return (
    <div class={flex({ flexDirection: "column", gap: "2", width: "full" })}>
      <section
        class={css({
          backgroundColor: "white",
          padding: { base: "2", md: "4" },
          borderRadius: "md",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "gray.200",
          boxShadow: "sm",
        })}
      >
        <h2
          class={css({
            fontSize: "lg",
            fontWeight: "bold",
            marginBottom: "4",
            color: "gray.900",
          })}
        >
          Bulk Import Blocking Rules
        </h2>
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
            <label
              for="bulk-rules-input"
              class={css({
                display: "block",
                fontSize: "xs",
                fontWeight: "bold",
                marginBottom: "1",
                color: "gray.500",
              })}
            >
              Paste rules here
            </label>
            <textarea
              id="bulk-rules-input"
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
    </div>
  );
}

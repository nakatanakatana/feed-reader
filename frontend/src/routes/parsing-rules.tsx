import { useLiveQuery } from "@tanstack/solid-db";
import { createFileRoute } from "@tanstack/solid-router";
import { For } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { AddParsingRuleForm } from "../components/AddParsingRuleForm";
import { ActionButton } from "../components/ui/ActionButton";
import { PageLayout } from "../components/ui/PageLayout";
import {
  deleteURLParsingRule,
  urlParsingRules,
} from "../lib/blocking-db";

export const Route = createFileRoute("/parsing-rules")({
  component: ParsingRulesComponent,
});

function ParsingRulesComponent() {
  const rules = useLiveQuery((q) => q.from({ rule: urlParsingRules }));

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
        <AddParsingRuleForm />

        {/* URL Parsing Rules Section */}
        <section class={sectionStyle}>
          <h2 class={headingStyle}>Domain URL Parsing Rules</h2>
          <div class={stack({ gap: "2" })}>
            <For each={rules()}>
              {(rule) => (
                <div class={cardStyle}>
                  <div class={stack({ gap: "1" })}>
                    <div class={css({ fontWeight: "bold", fontSize: "sm" })}>
                      {rule.domain}
                    </div>
                    <div
                      class={css({
                        fontSize: "xs",
                        color: "gray.600",
                        fontFamily: "mono",
                      })}
                    >
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
      </div>
    </PageLayout>
  );
}

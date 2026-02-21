import { useLiveQuery } from "@tanstack/solid-db";
import { createFileRoute } from "@tanstack/solid-router";
import { For } from "solid-js";
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
} from "../lib/blocking-db";

export const Route = createFileRoute("/blocking")({
  component: BlockingComponent,
});

function BlockingComponent() {
  const blocks = useLiveQuery((q) => q.from({ block: blockingRules }));

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

        {/* Existing Blocking Rules Section */}
        <section class={sectionStyle}>
          <h2 class={headingStyle}>Existing Blocking Rules</h2>
          <div class={stack({ gap: "2" })}>
            <For each={blocks()}>
              {(block) => (
                <div class={cardStyle}>
                  <div class={stack({ gap: "1" })}>
                    <div
                      class={css({
                        fontSize: "xs",
                        fontWeight: "bold",
                        color: "blue.600",
                        textTransform: "uppercase",
                      })}
                    >
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

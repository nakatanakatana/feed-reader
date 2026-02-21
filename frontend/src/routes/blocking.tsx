import { useLiveQuery } from "@tanstack/solid-db";
import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { AddBlockingRuleForm } from "../components/AddBlockingRuleForm";
import { BulkImportBlockingRulesModal } from "../components/BulkImportBlockingRulesModal";
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
  const [isBulkImportOpen, setIsBulkImportOpen] = createSignal(false);
  const [showSuccessToast, setShowSuccessToast] = createSignal(false);

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

  const handleBulkImportSuccess = () => {
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  return (
    <PageLayout>
      <div class={stack({ gap: "2", flex: "1", minHeight: 0 })}>
        <div class={stack({ gap: "4" })}>
          {/* Re-evaluation Trigger */}
          <div class={flex({ justifyContent: "flex-end" })}>
            <ActionButton
              onClick={() => reevaluateAllItems()}
              variant="secondary"
            >
              Re-evaluate All Items
            </ActionButton>
          </div>

          <AddBlockingRuleForm onBulkImport={() => setIsBulkImportOpen(true)} />
        </div>

        <BulkImportBlockingRulesModal
          isOpen={isBulkImportOpen()}
          onClose={() => setIsBulkImportOpen(false)}
          onSuccess={handleBulkImportSuccess}
        />

        {/* Success "Toast" */}
        <Show when={showSuccessToast()}>
          <div
            class={css({
              position: "fixed",
              bottom: "4",
              right: "4",
              backgroundColor: "green.600",
              color: "white",
              paddingX: "4",
              paddingY: "2",
              borderRadius: "md",
              boxShadow: "lg",
              zIndex: 50,
              fontSize: "sm",
              fontWeight: "medium",
              animation: "slideIn 0.3s ease-out",
            })}
          >
            Blocking rules imported successfully
          </div>
        </Show>

        {/* Existing Blocking Rules Section */}
        <div
          class={css({
            flex: "1",
            minHeight: 0,
            overflowY: "auto",
            backgroundColor: "white",
            borderRadius: "lg",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "gray.200",
            boxShadow: "sm",
          })}
        >
          <section class={css({ padding: { base: "4", md: "6" } })}>
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
      </div>
    </PageLayout>
  );
}


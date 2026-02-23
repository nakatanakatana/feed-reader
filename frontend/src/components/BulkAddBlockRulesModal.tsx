import { createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { type ParsedBlockRule, parseCSVBlockRules } from "../lib/csv-parser";
import { ActionButton } from "./ui/ActionButton";
import { Modal } from "./ui/Modal";

interface BulkAddBlockRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (
    rules: { ruleType: string; value: string; domain?: string }[],
  ) => Promise<void>;
  isPending: boolean;
}

export function BulkAddBlockRulesModal(props: BulkAddBlockRulesModalProps) {
  const [registrationResult, setRegistrationResult] = createSignal<{
    success: number;
    total: number;
  } | null>(null);
  const [csvText, setCsvText] = createSignal("");
  const [parsedRules, setParsedRules] = createSignal<ParsedBlockRule[]>([]);
  const [error, setError] = createSignal<string | null>(null);

  const handleTextChange = (e: Event) => {
    const text = (e.target as HTMLTextAreaElement).value;
    setCsvText(text);
    setParsedRules(parseCSVBlockRules(text));
    setRegistrationResult(null);
    setError(null);
  };

  const handleFileChange = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setCsvText(text);
      setParsedRules(parseCSVBlockRules(text));
      setRegistrationResult(null);
      setError(null);
    } catch (err) {
      console.error("Failed to read file", err);
      setError("Failed to read the file. Please try again.");
    } finally {
      input.value = "";
    }
  };

  const validRulesCount = () => parsedRules().filter((r) => r.isValid).length;

  const handleRegister = async () => {
    const validRules = parsedRules().filter((r) => r.isValid);
    if (validRules.length === 0) return;
    const total = parsedRules().length;
    setError(null);

    try {
      await props.onRegister(
        validRules.map((r) => ({
          ruleType: r.ruleType,
          value: r.value,
          domain: r.domain,
        })),
      );
      setRegistrationResult({
        success: validRules.length,
        total: total,
      });
      setCsvText("");
      setParsedRules([]);
    } catch (err) {
      console.error("Bulk registration failed", err);
      setError(
        err instanceof Error
          ? err.message
          : "Bulk registration failed. Please try again.",
      );
    }
  };

  const handleClose = () => {
    if (props.isPending) return;
    setRegistrationResult(null);
    setError(null);
    props.onClose();
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={handleClose}
      size="standard"
      title="Bulk Add Block Rules"
      disableBackdropClose={props.isPending}
      hideClose={props.isPending}
      footer={
        <div
          class={flex({
            justifyContent: "flex-end",
            gap: "2",
            width: "full",
            flexWrap: "wrap",
          })}
        >
          <Show
            when={registrationResult()}
            fallback={
              <>
                <ActionButton
                  variant="secondary"
                  onClick={handleClose}
                  disabled={props.isPending}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  variant="primary"
                  onClick={handleRegister}
                  disabled={props.isPending || validRulesCount() === 0}
                >
                  {props.isPending
                    ? "Registering..."
                    : `Register (${validRulesCount()} rules)`}
                </ActionButton>
              </>
            }
          >
            <ActionButton variant="primary" onClick={handleClose}>
              Done
            </ActionButton>
          </Show>
        </div>
      }
    >
      <div class={stack({ gap: "4" })}>
        <Show when={error()}>
          <div
            class={css({
              padding: "3",
              backgroundColor: "red.50",
              borderRadius: "md",
              border: "1px solid",
              borderColor: "red.100",
              color: "red.800",
              fontSize: "sm",
            })}
          >
            {error()}
          </div>
        </Show>

        <Show when={registrationResult()}>
          {(res) => (
            <div
              class={css({
                padding: "3",
                backgroundColor: "green.50",
                borderRadius: "md",
                border: "1px solid",
                borderColor: "green.100",
                color: "green.800",
                fontSize: "sm",
              })}
            >
              <p class={css({ fontWeight: "bold", marginBottom: "1" })}>
                Successfully registered rules!
              </p>
              <p>
                {res().success} rules were registered.
                <Show when={res().total > res().success}>
                  {" "}
                  ({res().total - res().success} invalid lines were skipped)
                </Show>
              </p>
            </div>
          )}
        </Show>

        <div class={stack({ gap: "2" })}>
          <label
            for="csv-input"
            class={css({ fontSize: "sm", fontWeight: "medium" })}
          >
            CSV Input (rule_type, value, [domain])
          </label>
          <textarea
            id="csv-input"
            value={csvText()}
            onInput={handleTextChange}
            placeholder={`user,john_doe\ndomain,example.com\nuser_domain,jane_doe,example.org`}
            class={css({
              width: "full",
              height: "32",
              padding: "2",
              border: "1px solid",
              borderColor: "gray.300",
              borderRadius: "md",
              fontSize: "sm",
              fontFamily: "mono",
            })}
          />
        </div>

        <div class={stack({ gap: "2" })}>
          <label
            for="csv-file"
            class={css({ fontSize: "sm", fontWeight: "medium" })}
          >
            Or Upload CSV File
          </label>
          <input
            id="csv-file"
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            class={css({
              fontSize: "sm",
              padding: "1",
            })}
          />
        </div>

        <Show when={parsedRules().length > 0}>
          <div class={stack({ gap: "2" })}>
            <h3 class={css({ fontSize: "sm", fontWeight: "bold" })}>Preview</h3>
            <div
              class={css({
                maxHeight: "64",
                overflowY: "auto",
                border: "1px solid",
                borderColor: "gray.200",
                rounded: "md",
              })}
            >
              <table
                class={css({
                  width: "full",
                  fontSize: "xs",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                })}
              >
                <thead
                  class={css({ bg: "gray.50", position: "sticky", top: 0 })}
                >
                  <tr>
                    <th
                      class={css({
                        p: "2",
                        textAlign: "left",
                        borderBottom: "1px solid",
                        borderColor: "gray.200",
                        width: "25%",
                      })}
                    >
                      Type
                    </th>
                    <th
                      class={css({
                        p: "2",
                        textAlign: "left",
                        borderBottom: "1px solid",
                        borderColor: "gray.200",
                        width: "30%",
                      })}
                    >
                      Value
                    </th>
                    <th
                      class={css({
                        p: "2",
                        textAlign: "left",
                        borderBottom: "1px solid",
                        borderColor: "gray.200",
                        width: "20%",
                      })}
                    >
                      Domain
                    </th>
                    <th
                      class={css({
                        p: "2",
                        textAlign: "left",
                        borderBottom: "1px solid",
                        borderColor: "gray.200",
                        width: "25%",
                      })}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <For each={parsedRules()}>
                    {(rule) => (
                      <tr
                        class={css({
                          borderBottom: "1px solid",
                          borderColor: "gray.100",
                        })}
                      >
                        <td class={css({ p: "2", wordBreak: "break-all" })}>
                          {rule.ruleType}
                        </td>
                        <td class={css({ p: "2", wordBreak: "break-all" })}>
                          {rule.value}
                        </td>
                        <td class={css({ p: "2", wordBreak: "break-all" })}>
                          {rule.domain || "-"}
                        </td>
                        <td class={css({ p: "2", wordBreak: "break-all" })}>
                          <Show
                            when={rule.isValid}
                            fallback={
                              <span
                                class={css({
                                  color: "red.500",
                                  fontWeight: "bold",
                                })}
                              >
                                ✕ {rule.error}
                              </span>
                            }
                          >
                            <span class={css({ color: "green.500" })}>
                              ✓ Valid
                            </span>
                          </Show>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </Show>
      </div>
    </Modal>
  );
}

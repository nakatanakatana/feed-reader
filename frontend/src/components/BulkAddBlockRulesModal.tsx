import { createSignal, For, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { parseCSVBlockRules, type ParsedBlockRule } from "../lib/csv-parser";
import { ActionButton } from "./ui/ActionButton";
import { Modal } from "./ui/Modal";

interface BulkAddBlockRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (rules: ParsedBlockRule[]) => Promise<void>;
  isPending: boolean;
}

export function BulkAddBlockRulesModal(props: BulkAddBlockRulesModalProps) {
  const [csvText, setCsvText] = createSignal("");
  const [parsedRules, setParsedRules] = createSignal<ParsedBlockRule[]>([]);

  const handleTextChange = (e: Event) => {
    const text = (e.target as HTMLTextAreaElement).value;
    setCsvText(text);
    setParsedRules(parseCSVBlockRules(text));
  };

  const handleFileChange = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setCsvText(text);
      setParsedRules(parseCSVBlockRules(text));
    } catch (err) {
      console.error("Failed to read file", err);
    } finally {
      input.value = "";
    }
  };

  const validRulesCount = () => parsedRules().filter((r) => r.isValid).length;

  const handleRegister = async () => {
    const validRules = parsedRules().filter((r) => r.isValid);
    if (validRules.length === 0) return;
    await props.onRegister(validRules);
    setCsvText("");
    setParsedRules([]);
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      size="standard"
      title="Bulk Add Block Rules"
      disableBackdropClose={props.isPending}
      footer={
        <div class={flex({ justifyContent: "flex-end", gap: "2", width: "full" })}>
          <ActionButton variant="secondary" onClick={props.onClose} disabled={props.isPending}>
            Cancel
          </ActionButton>
          <ActionButton
            variant="primary"
            onClick={handleRegister}
            disabled={props.isPending || validRulesCount() === 0}
          >
            {props.isPending ? "Registering..." : `Register (${validRulesCount()} rules)`}
          </ActionButton>
        </div>
      }
    >
      <div class={stack({ gap: "4" })}>
        <div class={stack({ gap: "2" })}>
          <label class={css({ fontSize: "sm", fontWeight: "medium" })}>
            CSV Input (rule_type, value, [domain])
          </label>
          <textarea
            value={csvText()}
            onInput={handleTextChange}
            placeholder="user,john_doe&#10;domain,example.com&#10;user_domain,jane_doe,example.org"
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
          <label class={css({ fontSize: "sm", fontWeight: "medium" })}>Or Upload CSV File</label>
          <input
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
              <table class={css({ width: "full", fontSize: "xs", borderCollapse: "collapse" })}>
                <thead class={css({ bg: "gray.50", position: "sticky", top: 0 })}>
                  <tr>
                    <th class={css({ p: "2", textAlign: "left", borderBottom: "1px solid", borderColor: "gray.200" })}>
                      Type
                    </th>
                    <th class={css({ p: "2", textAlign: "left", borderBottom: "1px solid", borderColor: "gray.200" })}>
                      Value
                    </th>
                    <th class={css({ p: "2", textAlign: "left", borderBottom: "1px solid", borderColor: "gray.200" })}>
                      Domain
                    </th>
                    <th class={css({ p: "2", textAlign: "left", borderBottom: "1px solid", borderColor: "gray.200" })}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <For each={parsedRules()}>
                    {(rule) => (
                      <tr class={css({ borderBottom: "1px solid", borderColor: "gray.100" })}>
                        <td class={css({ p: "2" })}>{rule.rule_type}</td>
                        <td class={css({ p: "2" })}>{rule.value}</td>
                        <td class={css({ p: "2" })}>{rule.domain || "-"}</td>
                        <td class={css({ p: "2" })}>
                          <Show
                            when={rule.isValid}
                            fallback={
                              <span class={css({ color: "red.500", fontWeight: "bold" })}>
                                ✕ {rule.error}
                              </span>
                            }
                          >
                            <span class={css({ color: "green.500" })}>✓ Valid</span>
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

import { createSignal } from "solid-js";
import { css } from "../../styled-system/css";
import { flex, stack } from "../../styled-system/patterns";
import { bulkCreateBlockingRules, parseBulkBlockingRules } from "../lib/blocking-db";
import { ActionButton } from "./ui/ActionButton";
import { LoadingState } from "./ui/LoadingState";
import { Modal } from "./ui/Modal";

interface BulkImportBlockingRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BulkImportBlockingRulesModal(props: BulkImportBlockingRulesModalProps) {
  const [bulkInput, setBulkInput] = createSignal("");
  const [isPending, setIsPending] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const handleBulkImport = async (e: Event) => {
    e.preventDefault();
    const input = bulkInput().trim();
    if (!input) return;

    setIsPending(true);
    setError(null);

    try {
      const rulesToCreate = parseBulkBlockingRules(input);

      if (rulesToCreate.length > 0) {
        await bulkCreateBlockingRules(rulesToCreate);
        setBulkInput("");
        props.onSuccess?.();
        props.onClose();
      } else {
        setError("No valid rules found in input.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import rules");
    } finally {
      setIsPending(false);
    }
  };

  const handleCancel = () => {
    setBulkInput("");
    setError(null);
    props.onClose();
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
    <Modal
      isOpen={props.isOpen}
      onClose={handleCancel}
      size="standard"
      title="Bulk Import Blocking Rules"
      disableBackdropClose={isPending()}
      ariaLabel="Bulk Import Blocking Rules"
    >
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
            for="bulk-rules-input-modal"
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
            id="bulk-rules-input-modal"
            placeholder="user_domain,,spam.com,&#10;keyword,,,badword"
            value={bulkInput()}
            onInput={(e) => setBulkInput(e.currentTarget.value)}
            disabled={isPending()}
            class={css(inputStyleConfig, {
              minHeight: "150px",
              fontFamily: "mono",
              resize: "vertical",
            })}
          />
        </div>

        {error() && (
          <p class={css({ color: "red.500", fontSize: "sm" })}>
            Error: {error()}
          </p>
        )}

        {isPending() && <LoadingState label="Importing rules..." />}

        <div class={flex({ justifyContent: "flex-end", gap: "2" })}>
          <ActionButton
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isPending()}
          >
            Cancel
          </ActionButton>
          <ActionButton
            type="submit"
            variant="primary"
            disabled={!bulkInput().trim() || isPending()}
          >
            Import Rules
          </ActionButton>
        </div>
      </form>
    </Modal>
  );
}

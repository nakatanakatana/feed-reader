import { ActionButton } from "./ui/ActionButton";
import { css } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { Show } from "solid-js";

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onMarkAsRead: () => void;
  isProcessing: boolean;
}

export function BulkActionBar(props: BulkActionBarProps) {
  return (
    <Show when={props.selectedCount > 0}>
      <div
        data-testid="bulk-action-bar"
        class={flex({
          position: "fixed",
          bottom: "6",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
          backgroundColor: "blue.50",
          border: "1px solid",
          borderColor: "blue.200",
          borderRadius: "lg",
          padding: "4",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "xl",
          width: "max-content",
          minWidth: "300px",
          gap: "8",
        })}
      >
        <span
          class={css({
            fontSize: "sm",
            fontWeight: "medium",
            color: "blue.800",
            whiteSpace: "nowrap",
          })}
        >
          {props.selectedCount} items selected
        </span>
        <div class={flex({ gap: "2" })}>
          <ActionButton
            size="sm"
            variant="secondary"
            onClick={props.onClear}
          >
            Clear
          </ActionButton>
          <ActionButton
            size="sm"
            variant="primary"
            onClick={props.onMarkAsRead}
            disabled={props.isProcessing}
          >
            {props.isProcessing ? "Processing..." : "Mark as Read"}
          </ActionButton>
        </div>
      </div>
    </Show>
  );
}

import { type JSX, Show } from "solid-js";
import { css } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { ActionButton } from "./ui/ActionButton";

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onExport?: () => void;
  children?: JSX.Element;
  unit?: string;
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
          {props.selectedCount} {props.unit || "items"} selected
        </span>
        <div class={flex({ gap: "2" })}>
          <ActionButton size="sm" variant="secondary" onClick={props.onClear}>
            Clear
          </ActionButton>
          <Show when={props.onExport}>
            <ActionButton
              size="sm"
              variant="secondary"
              onClick={() => props.onExport?.()}
            >
              Export OPML
            </ActionButton>
          </Show>
          {props.children}
        </div>
      </div>
    </Show>
  );
}

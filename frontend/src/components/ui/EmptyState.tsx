import type { JSX } from "solid-js";
import { css } from "../../../styled-system/css";
import { center, stack } from "../../../styled-system/patterns";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: JSX.Element;
}

export function EmptyState(props: EmptyStateProps) {
  return (
    <div
      class={center({
        border: "1px dashed",
        borderColor: "gray.200",
        borderRadius: "md",
        padding: "6",
        textAlign: "center",
        color: "gray.600",
      })}
    >
      <div class={stack({ gap: "2", alignItems: "center" })}>
        <div class={css({ fontWeight: "medium" })}>{props.title}</div>
        {props.description ? (
          <div class={css({ fontSize: "sm", color: "gray.500" })}>
            {props.description}
          </div>
        ) : null}
        {props.action}
      </div>
    </div>
  );
}

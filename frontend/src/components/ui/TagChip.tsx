import type { JSX } from "solid-js";
import { css, cx } from "../../../styled-system/css";

interface TagChipProps {
  children: JSX.Element;
  selected?: boolean;
  onClick?: () => void;
  class?: string;
}

export function TagChip(props: TagChipProps) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      class={cx(
        css({
          px: "3",
          py: "1",
          minH: "8",
          rounded: "full",
          fontSize: "xs",
          cursor: "pointer",
          border: "1px solid",
          display: "inline-flex",
          alignItems: "center",
          gap: "1.5",
          transition: "all 0.2s",
          ...(props.selected
            ? { bg: "blue.600", borderColor: "blue.600", color: "white" }
            : {
                bg: "transparent",
                borderColor: "gray.300",
                color: "gray.600",
              }),
        }),
        props.class,
      )}
    >
      {props.children}
    </button>
  );
}

import type { JSX } from "solid-js";
import { css, cx } from "../../../styled-system/css";

type BadgeVariant = "neutral" | "primary" | "warning";

interface BadgeProps {
  children: JSX.Element;
  variant?: BadgeVariant;
  class?: string;
  title?: string;
}

export function Badge(props: BadgeProps) {
  const variant = () => props.variant ?? "neutral";

  return (
    <span
      title={props.title}
      class={cx(
        css({
          fontSize: "xs",
          fontWeight: "bold",
          paddingX: "2",
          paddingY: "0.5",
          borderRadius: "full",
          minWidth: "2rem",
          textAlign: "center",
          backgroundColor:
            variant() === "primary"
              ? "blue.100"
              : variant() === "warning"
                ? "yellow.100"
                : "gray.100",
          color:
            variant() === "primary"
              ? "blue.700"
              : variant() === "warning"
                ? "yellow.800"
                : "gray.700",
        }),
        props.class,
      )}
    >
      {props.children}
    </span>
  );
}

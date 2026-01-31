import type { JSX } from "solid-js";
import { css, cx } from "../../../styled-system/css";

type BadgeVariant = "neutral" | "primary";

interface BadgeProps {
  children: JSX.Element;
  variant?: BadgeVariant;
  class?: string;
}

export function Badge(props: BadgeProps) {
  const variant = () => props.variant ?? "neutral";

  return (
    <span
      class={cx(
        css({
          fontSize: "xs",
          fontWeight: "bold",
          paddingX: "2",
          paddingY: "0.5",
          borderRadius: "full",
          minWidth: "2rem",
          textAlign: "center",
          backgroundColor: variant() === "primary" ? "blue.100" : "gray.100",
          color: variant() === "primary" ? "blue.700" : "gray.700",
        }),
        props.class,
      )}
    >
      {props.children}
    </span>
  );
}

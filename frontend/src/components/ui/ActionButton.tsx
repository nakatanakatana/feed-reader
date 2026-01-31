import type { JSX } from "solid-js";
import { css, cx } from "../../../styled-system/css";

type ActionButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ActionButtonSize = "sm" | "md";

type NativeButtonProps = Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "class" | "children" | "type" | "disabled" | "aria-label"
>;

interface ActionButtonProps extends NativeButtonProps {
  children: JSX.Element;
  onClick?: (event?: MouseEvent) => void;
  type?: "button" | "submit" | "reset";
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  disabled?: boolean;
  ariaLabel?: string;
  class?: string;
  onClickEvent?: (event: MouseEvent) => void;
}

export function ActionButton(props: ActionButtonProps) {
  const variant = () => props.variant ?? "secondary";
  const size = () => props.size ?? "md";

  const sizeStyle = () =>
    size() === "sm"
      ? { fontSize: "xs", paddingY: "1.5", paddingX: "3" }
      : { fontSize: "sm", paddingY: "2", paddingX: "4" };

  const variantStyle = () => {
    switch (variant()) {
      case "primary":
        return {
          backgroundColor: "blue.600",
          color: "white",
          _hover: { backgroundColor: "blue.700" },
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          color: "blue.600",
          _hover: { backgroundColor: "blue.50", color: "blue.700" },
        };
      case "danger":
        return {
          backgroundColor: "red.50",
          color: "red.600",
          _hover: { backgroundColor: "red.100" },
        };
      default:
        return {
          backgroundColor: "gray.100",
          color: "gray.700",
          _hover: { backgroundColor: "gray.200" },
        };
    }
  };

  return (
    <button
      {...props}
      type={props.type ?? "button"}
      onClick={(event) => {
        props.onClickEvent?.(event);
        props.onClick?.(event);
      }}
      disabled={props.disabled}
      aria-label={props.ariaLabel}
      class={cx(
        css({
          borderRadius: "md",
          fontWeight: "medium",
          cursor: "pointer",
          border: "1px solid",
          borderColor:
            variant() === "ghost"
              ? "transparent"
              : variant() === "danger"
                ? "red.200"
                : "gray.200",
          transition: "all 0.2s",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "2",
          _disabled: { opacity: 0.5, cursor: "not-allowed" },
          ...sizeStyle(),
          ...variantStyle(),
        }),
        props.class,
      )}
    >
      {props.children}
    </button>
  );
}

import { type JSX, Show } from "solid-js";
import { css, cx } from "../../../styled-system/css";

type ActionButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ActionButtonSize = "sm" | "md";

type NativeButtonProps = Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "class" | "children" | "type" | "disabled" | "aria-label"
>;

interface ActionButtonProps extends NativeButtonProps {
  children: JSX.Element;
  icon?: JSX.Element;
  hideTextOnMobile?: boolean;
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
      ? { fontSize: "xs", py: "1.5", px: "3" }
      : { fontSize: "sm", py: "2", px: "4" };

  const variantStyle = () => {
    switch (variant()) {
      case "primary":
        return {
          bg: "blue.600",
          color: "white",
          _hover: { bg: "blue.700" },
        };
      case "ghost":
        return {
          bg: "transparent",
          color: "blue.600",
          _hover: { bg: "blue.50", color: "blue.700" },
        };
      case "danger":
        return {
          bg: "red.50",
          color: "red.600",
          _hover: { bg: "red.100" },
        };
      default:
        return {
          bg: "transparent",
          color: "gray.600",
          _hover: { bg: "gray.50", color: "gray.700" },
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
                : variant() === "primary"
                  ? "blue.600"
                  : "gray.300",
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
      {props.icon}
      <Show when={props.hideTextOnMobile} fallback={props.children}>
        <span
          class={css({
            display: { base: "none", md: "inline" },
          })}
        >
          {props.children}
        </span>
      </Show>
    </button>
  );
}

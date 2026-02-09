import type { JSX } from "solid-js";
import { onMount, Show } from "solid-js";
import { css } from "../../../styled-system/css";
import { center, flex, stack } from "../../../styled-system/patterns";

type ModalSize = "standard" | "full";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  title?: string;
  hideClose?: boolean;
  headerExtras?: JSX.Element;
  footer?: JSX.Element;
  children: JSX.Element;
  disableBackdropClose?: boolean;
  ariaLabel?: string;
  bodyPadding?: boolean;
  onKeyDown?: (e: KeyboardEvent) => void;
  ref?: (el: HTMLDivElement) => void;
}

export function Modal(props: ModalProps) {
  let modalRef: HTMLDivElement | undefined;

  onMount(() => {
    if (modalRef) {
      modalRef.focus();
    }
  });

  const size = () => props.size ?? "standard";

  const panelStyle = () =>
    css({
      backgroundColor: "white",
      borderRadius: { base: "none", md: "lg" },
      boxShadow: "xl",
      overflow: "hidden",
      position: "relative",
      textAlign: "left",
      outline: "none",
      display: "flex",
      flexDirection: "column",
      width:
        size() === "full"
          ? { base: "full", md: "90vw" }
          : { base: "96vw", md: "80vw", lg: "50vw" },
      height: size() === "full" ? { base: "full", md: "90vh" } : "auto",
      maxWidth: size() === "full" ? { base: "full", md: "none" } : "48rem",
      maxHeight: size() === "full" ? { base: "full", md: "90vh" } : "90vh",
    });

  const handleBackdropClick = (e: MouseEvent) => {
    if (props.disableBackdropClose) return;
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    props.onKeyDown?.(e);
    if (e.key === "Escape" && !props.disableBackdropClose) {
      props.onClose();
    }

    if (e.key === "Tab" && modalRef) {
      const focusableSelector =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const focusables = Array.from(
        modalRef.querySelectorAll(focusableSelector),
      ) as HTMLElement[];

      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (
          document.activeElement === first ||
          document.activeElement === modalRef
        ) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  return (
    <Show when={props.isOpen}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Backdrop click handling */}
      <div
        onClick={handleBackdropClick}
        onKeyDown={handleKeyDown}
        class={center({
          position: "fixed",
          top: 0,
          left: 0,
          width: "screen",
          height: "screen",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 1000,
          padding: { base: "0", md: "4" },
        })}
      >
        <div
          ref={(el) => {
            modalRef = el;
            props.ref?.(el);
          }}
          tabindex="-1"
          role="dialog"
          aria-modal="true"
          aria-label={props.ariaLabel ?? props.title}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          class={panelStyle()}
        >
          <Show when={props.title || !props.hideClose}>
            <div
              class={flex({
                justifyContent: "space-between",
                alignItems: "center",
                padding: "4",
                borderBottom: "1px solid",
                borderColor: "gray.100",
              })}
            >
              <div class={flex({ gap: "3", alignItems: "center", flex: 1 })}>
                <Show when={props.title}>
                  <h2 class={css({ fontSize: "lg", fontWeight: "bold" })}>
                    {props.title}
                  </h2>
                </Show>
                {props.headerExtras}
              </div>
              <Show when={!props.hideClose}>
                <button
                  type="button"
                  onClick={props.onClose}
                  class={css({
                    padding: "2",
                    cursor: "pointer",
                    color: "gray.500",
                    _hover: { color: "gray.700" },
                  })}
                  aria-label="Close"
                >
                  ✕
                </button>
              </Show>
            </div>
          </Show>
          <div
            class={stack({
              padding: props.bodyPadding === false ? "0" : "6",
              gap: "4",
              overflowY: "auto",
              flex: 1,
              minHeight: 0,
            })}
          >
            {props.children}
          </div>
          <Show when={props.footer}>
            <div
              class={flex({
                justifyContent: "space-between",
                alignItems: "center",
                padding: "4",
                borderTop: "1px solid",
                borderColor: "gray.100",
                backgroundColor: "gray.50",
              })}
            >
              {props.footer}
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}

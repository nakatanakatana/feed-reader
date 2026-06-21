import type { JSX } from "solid-js";
import { createEffect, onCleanup, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { css } from "../../../styled-system/css";
import { flex, stack } from "../../../styled-system/patterns";

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
  ref?: (el: HTMLDialogElement) => void;
  focusKey?: unknown;
}

export function Modal(props: ModalProps) {
  let dialogRef: HTMLDialogElement | undefined;
  let panelRef: HTMLDivElement | undefined;

  const focusPanel = () => {
    queueMicrotask(() => {
      if (!dialogRef?.isConnected || !dialogRef.matches(":modal")) return;
      panelRef?.focus();
    });
  };

  const openDialog = (el: HTMLDialogElement) => {
    queueMicrotask(() => {
      if (!el.isConnected) return;
      if (!el.matches(":modal")) {
        if (el.open) {
          el.close();
        }
        el.showModal();
      }
      focusPanel();
    });
  };

  const size = () => props.size ?? "standard";

  createEffect(() => {
    if (!props.isOpen) return;
    void props.focusKey;
    focusPanel();
  });

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

  const dialogStyle = () => {
    const isFull = size() === "full";
    return css({
      background: "transparent",
      border: "none",
      padding: isFull ? "0" : { base: "0", md: "4" },
      margin: "0",
      outline: "none",
      width: "100vw",
      height: "100vh",
      maxWidth: "100vw",
      maxHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      _backdrop: {
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      },
    });
  };

  const handleCancel = (e: Event) => {
    e.preventDefault();
    if (!props.disableBackdropClose) {
      props.onClose();
    }
  };

  const handleBackdropClick = (e: MouseEvent) => {
    if (props.disableBackdropClose) return;
    if (e.target === dialogRef) {
      props.onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    props.onKeyDown?.(e);

    if (e.key === "Tab" && dialogRef) {
      const focusableSelector =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const focusables = Array.from(
        dialogRef.querySelectorAll<HTMLElement>(focusableSelector),
      );

      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (
          document.activeElement === first ||
          document.activeElement === panelRef ||
          document.activeElement === dialogRef
        ) {
          e.preventDefault();
          last.focus();
        }
      } else if (
        document.activeElement === last ||
        document.activeElement === panelRef ||
        document.activeElement === dialogRef
      ) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <Show when={props.isOpen}>
      <Portal mount={document.body}>
        <dialog
          ref={(el) => {
            dialogRef = el;
            props.ref?.(el);
            openDialog(el);
            onCleanup(() => {
              el.close();
            });
          }}
          aria-label={props.ariaLabel ?? props.title}
          onCancel={handleCancel}
          onClick={handleBackdropClick}
          onKeyDown={handleKeyDown}
          class={dialogStyle()}
        >
          <div
            ref={(el) => {
              panelRef = el;
            }}
            onClick={(e) => e.stopPropagation()}
            class={panelStyle()}
            tabindex="-1"
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
        </dialog>
      </Portal>
    </Show>
  );
}

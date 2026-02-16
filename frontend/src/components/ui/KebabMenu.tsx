import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { css, cx } from "../../../styled-system/css";

interface KebabMenuAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}

interface KebabMenuProps {
  actions: KebabMenuAction[];
  ariaLabel?: string;
}

export function KebabMenu(props: KebabMenuProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  let buttonRef: HTMLButtonElement | undefined;
  let menuRef: HTMLDivElement | undefined;

  const toggle = (e: MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen());
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (
      isOpen() &&
      buttonRef &&
      !buttonRef.contains(e.target as Node) &&
      menuRef &&
      !menuRef.contains(e.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpen()) {
      setIsOpen(false);
      buttonRef?.focus();
    }
  };

  onMount(() => {
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener("click", handleClickOutside);
    document.removeEventListener("keydown", handleKeyDown);
  });

  const [coords, setCoords] = createSignal({ top: 0, left: 0 });

  const updateCoords = () => {
    if (buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX - 160, // approximate width
      });
    }
  };

  createSignal(() => {
    if (isOpen()) {
      updateCoords();
    }
  });

  return (
    <div class={css({ position: "relative", display: "inline-block" })}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={props.ariaLabel || "More actions"}
        onClick={toggle}
        class={css({
          p: "1",
          rounded: "md",
          cursor: "pointer",
          _hover: { bg: "gray.100" },
          display: "flex",
          ai: "center",
          jc: "center",
        })}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      <Show when={isOpen()}>
        <Portal>
          <div
            ref={menuRef}
            class={css({
              position: "absolute",
              zIndex: 1000,
              bg: "white",
              border: "1px solid",
              borderColor: "gray.200",
              rounded: "md",
              shadow: "lg",
              minWidth: "160px",
              py: "1",
            })}
            style={{
              top: `${buttonRef?.getBoundingClientRect().bottom! + window.scrollY + 4}px`,
              left: `${buttonRef?.getBoundingClientRect().right! + window.scrollX - 160}px`,
            }}
          >
            <For each={props.actions}>
              {(action) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                    setIsOpen(false);
                  }}
                  class={cx(
                    css({
                      width: "full",
                      textAlign: "left",
                      px: "4",
                      py: "2",
                      fontSize: "sm",
                      cursor: "pointer",
                      _hover: { bg: "gray.50" },
                    }),
                    action.variant === "danger"
                      ? css({ color: "red.600", _hover: { bg: "red.50" } })
                      : "",
                  )}
                >
                  {action.label}
                </button>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </div>
  );
}

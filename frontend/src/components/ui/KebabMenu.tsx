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
  const [focusedIndex, setFocusedIndex] = createSignal(-1);
  let buttonRef: HTMLButtonElement | undefined;
  let menuRef: HTMLDivElement | undefined;
  const itemRefs: HTMLButtonElement[] = [];

  const toggle = (e: MouseEvent) => {
    e.stopPropagation();
    const nextOpen = !isOpen();
    setIsOpen(nextOpen);
    if (nextOpen) {
      setFocusedIndex(-1);
    }
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
    if (!isOpen()) {
      if (
        (e.key === "Enter" || e.key === " ") &&
        buttonRef === document.activeElement
      ) {
        setIsOpen(true);
        setFocusedIndex(-1);
      }
      return;
    }

    if (e.key === "Escape") {
      setIsOpen(false);
      buttonRef?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (focusedIndex() + 1) % props.actions.length;
      setFocusedIndex(next);
      itemRefs[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next =
        (focusedIndex() - 1 + props.actions.length) % props.actions.length;
      setFocusedIndex(next);
      itemRefs[next]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusedIndex(0);
      itemRefs[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      setFocusedIndex(props.actions.length - 1);
      itemRefs[props.actions.length - 1]?.focus();
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

  const getMenuPosition = () => {
    if (!buttonRef) return { top: "0px", left: "0px" };
    const rect = buttonRef.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const menuWidth = 160; // Initial assumed width
    const menuHeight = menuRef?.offsetHeight ?? 0;

    let top = rect.bottom + scrollY + 4;
    let left = rect.right + scrollX - menuWidth;

    const margin = 4;

    // Clamp horizontally
    const minLeft = scrollX + margin;
    const maxLeft = scrollX + viewportWidth - menuWidth - margin;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;

    // Clamp vertically
    const maxTop = scrollY + viewportHeight - menuHeight - margin;
    if (top > maxTop) top = maxTop;

    return {
      top: `${top}px`,
      left: `${left}px`,
    };
  };

  return (
    <div class={css({ position: "relative", display: "inline-block" })}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={props.ariaLabel || "More actions"}
        aria-haspopup="menu"
        aria-expanded={isOpen()}
        onClick={toggle}
        class={css({
          p: "1",
          rounded: "md",
          cursor: "pointer",
          _hover: { bg: "gray.100" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
          <title>More actions</title>
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      <Show when={isOpen()}>
        <Portal>
          <div
            ref={menuRef}
            role="menu"
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
            style={getMenuPosition()}
          >
            <For each={props.actions}>
              {(action, index) => (
                <button
                  ref={(el) => {
                    itemRefs[index()] = el;
                  }}
                  type="button"
                  role="menuitem"
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
                      _focus: { bg: "gray.50", outline: "none" },
                    }),
                    action.variant === "danger"
                      ? css({
                          color: "red.600",
                          _hover: { bg: "red.50" },
                          _focus: { bg: "red.50" },
                        })
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

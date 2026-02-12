import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { css } from "../../../styled-system/css";
import { flex } from "../../../styled-system/patterns";

interface HorizontalScrollListProps {
  children: any;
  class?: string;
}

export function HorizontalScrollList(props: HorizontalScrollListProps) {
  let scrollContainer: HTMLDivElement | undefined;
  const [showLeftArrow, setShowLeftArrow] = createSignal(false);
  const [showRightArrow, setShowRightArrow] = createSignal(false);

  const checkScroll = () => {
    if (!scrollContainer) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  onMount(() => {
    checkScroll();
    scrollContainer?.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
  });

  onCleanup(() => {
    scrollContainer?.removeEventListener("scroll", checkScroll);
    window.removeEventListener("resize", checkScroll);
  });

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainer) return;
    const scrollAmount = scrollContainer.clientWidth * 0.8;
    scrollContainer.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div
      class={css({
        position: "relative",
        width: "full",
        display: "flex",
        alignItems: "center",
        minWidth: 0,
      })}
    >
      <Show when={showLeftArrow()}>
        <button
          class={css({
            position: "absolute",
            left: 0,
            zIndex: 1,
            height: "full",
            width: "8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(to right, white 60%, transparent)",
            cursor: "pointer",
            border: "none",
            color: "gray.600",
            _hover: { color: "gray.900" },
          })}
          onClick={() => scroll("left")}
          aria-label="Scroll left"
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
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </Show>

      <div
        ref={scrollContainer}
        onMouseEnter={checkScroll}
        data-testid="horizontal-scroll-container"
        class={flex({
          gap: "2",
          overflowX: "auto",
          flexWrap: "nowrap",
          width: "full",
          alignItems: "center",
          scrollbarWidth: "none", // Hide scrollbar for cleaner look
          "&::-webkit-scrollbar": { display: "none" },
          paddingX: "1",
          minWidth: 0,
        })}
      >
        {props.children}
      </div>

      <Show when={showRightArrow()}>
        <button
          class={css({
            position: "absolute",
            right: 0,
            zIndex: 1,
            height: "full",
            width: "8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(to left, white 60%, transparent)",
            cursor: "pointer",
            border: "none",
            color: "gray.600",
            _hover: { color: "gray.900" },
          })}
          onClick={() => scroll("right")}
          aria-label="Scroll right"
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
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </Show>
    </div>
  );
}

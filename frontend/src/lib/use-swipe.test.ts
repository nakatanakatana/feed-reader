import { createRoot } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { useSwipe } from "./use-swipe";

describe("useSwipe", () => {
  it("calculates displacement correctly during touchmove", () => {
    createRoot((dispose) => {
      const { x, handlers } = useSwipe();

      // Start touch at 100
      handlers.touchstart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      expect(x()).toBe(0);

      // Move to 150
      handlers.touchmove({
        touches: [{ clientX: 150, clientY: 100 }],
      } as unknown as TouchEvent);

      expect(x()).toBe(50);

      // Move to 30
      handlers.touchmove({
        touches: [{ clientX: 30, clientY: 100 }],
      } as unknown as TouchEvent);

      expect(x()).toBe(-70);

      dispose();
    });
  });

  it("calls onSwipeRight when threshold is exceeded to the right", () => {
    const onSwipeRight = vi.fn();
    createRoot((dispose) => {
      const { handlers } = useSwipe({
        onSwipeRight,
        threshold: 50,
      });

      handlers.touchstart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handlers.touchmove({
        touches: [{ clientX: 160, clientY: 100 }],
      } as unknown as TouchEvent);

      handlers.touchend({} as unknown as TouchEvent);

      expect(onSwipeRight).toHaveBeenCalled();
      dispose();
    });
  });

  it("calls onSwipeLeft when threshold is exceeded to the left", () => {
    const onSwipeLeft = vi.fn();
    createRoot((dispose) => {
      const { handlers } = useSwipe({
        onSwipeLeft,
        threshold: 50,
      });

      handlers.touchstart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handlers.touchmove({
        touches: [{ clientX: 40, clientY: 100 }],
      } as unknown as TouchEvent);

      handlers.touchend({} as unknown as TouchEvent);

      expect(onSwipeLeft).toHaveBeenCalled();
      dispose();
    });
  });

  it("does not call callbacks if threshold is not met", () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    createRoot((dispose) => {
      const { handlers } = useSwipe({
        onSwipeLeft,
        onSwipeRight,
        threshold: 50,
      });

      handlers.touchstart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handlers.touchmove({
        touches: [{ clientX: 120, clientY: 100 }],
      } as unknown as TouchEvent);

      handlers.touchend({} as unknown as TouchEvent);

      expect(onSwipeLeft).not.toHaveBeenCalled();
      expect(onSwipeRight).not.toHaveBeenCalled();
      dispose();
    });
  });

  it("resets x to 0 after touchend", () => {
    createRoot((dispose) => {
      const { x, handlers } = useSwipe();

      handlers.touchstart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      handlers.touchmove({
        touches: [{ clientX: 150, clientY: 100 }],
      } as unknown as TouchEvent);

      expect(x()).toBe(50);

      handlers.touchend({} as unknown as TouchEvent);

      expect(x()).toBe(0);
      dispose();
    });
  });

  it("ignores multi-touch", () => {
    createRoot((dispose) => {
      const { x, handlers } = useSwipe();

      handlers.touchstart({
        touches: [{ clientX: 100 }, { clientX: 200 }],
      } as unknown as TouchEvent);

      handlers.touchmove({
        touches: [{ clientX: 150 }, { clientX: 250 }],
      } as unknown as TouchEvent);

      expect(x()).toBe(0);
      dispose();
    });
  });

  it("cancels swipe if vertical movement is dominant", () => {
    createRoot((dispose) => {
      const { x, handlers } = useSwipe();

      handlers.touchstart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as TouchEvent);

      // Move slightly horizontally (10px) but mostly vertically (50px)
      handlers.touchmove({
        touches: [{ clientX: 110, clientY: 150 }],
      } as unknown as TouchEvent);

      expect(x()).toBe(0);
      dispose();
    });
  });
});

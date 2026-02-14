import { createRoot } from "solid-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTouch,
  createTouchEvent,
  resetTouchIdentifier,
} from "../test-utils/touch";
import { useSwipe } from "./use-swipe";

describe("useSwipe", () => {
  beforeEach(() => {
    resetTouchIdentifier();
  });

  it("calculates displacement correctly during touchmove", () => {
    createRoot((dispose) => {
      const { x, handlers } = useSwipe();
      const target = document.createElement("div");

      // Start touch at 100
      handlers.ontouchstart(
        createTouchEvent("touchstart", target, [
          createTouch(target, { x: 100, y: 100 }),
        ]),
      );

      expect(x()).toBe(0);

      // Move to 150
      handlers.ontouchmove(
        createTouchEvent("touchmove", target, [
          createTouch(target, { x: 150, y: 100 }),
        ]),
      );

      expect(x()).toBe(50);

      // Move to 30
      handlers.ontouchmove(
        createTouchEvent("touchmove", target, [
          createTouch(target, { x: 30, y: 100 }),
        ]),
      );

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
      const target = document.createElement("div");

      handlers.ontouchstart(
        createTouchEvent("touchstart", target, [
          createTouch(target, { x: 100, y: 100 }),
        ]),
      );

      handlers.ontouchmove(
        createTouchEvent("touchmove", target, [
          createTouch(target, { x: 160, y: 100 }),
        ]),
      );

      handlers.ontouchend(createTouchEvent("touchend", target, []));

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
      const target = document.createElement("div");

      handlers.ontouchstart(
        createTouchEvent("touchstart", target, [
          createTouch(target, { x: 100, y: 100 }),
        ]),
      );

      handlers.ontouchmove(
        createTouchEvent("touchmove", target, [
          createTouch(target, { x: 40, y: 100 }),
        ]),
      );

      handlers.ontouchend(createTouchEvent("touchend", target, []));

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
      const target = document.createElement("div");

      handlers.ontouchstart(
        createTouchEvent("touchstart", target, [
          createTouch(target, { x: 100, y: 100 }),
        ]),
      );

      handlers.ontouchmove(
        createTouchEvent("touchmove", target, [
          createTouch(target, { x: 120, y: 100 }),
        ]),
      );

      handlers.ontouchend(createTouchEvent("touchend", target, []));

      expect(onSwipeLeft).not.toHaveBeenCalled();
      expect(onSwipeRight).not.toHaveBeenCalled();
      dispose();
    });
  });

  it("resets x to 0 after touchend", () => {
    createRoot((dispose) => {
      const { x, handlers } = useSwipe();
      const target = document.createElement("div");

      handlers.ontouchstart(
        createTouchEvent("touchstart", target, [
          createTouch(target, { x: 100, y: 100 }),
        ]),
      );

      handlers.ontouchmove(
        createTouchEvent("touchmove", target, [
          createTouch(target, { x: 150, y: 100 }),
        ]),
      );

      expect(x()).toBe(50);

      handlers.ontouchend(createTouchEvent("touchend", target, []));

      expect(x()).toBe(0);
      dispose();
    });
  });

  it("ignores multi-touch", () => {
    createRoot((dispose) => {
      const { x, handlers } = useSwipe();
      const target = document.createElement("div");

      handlers.ontouchstart(
        createTouchEvent("touchstart", target, [
          createTouch(target, { x: 100, y: 100 }),
          createTouch(target, { x: 200, y: 100 }),
        ]),
      );

      handlers.ontouchmove(
        createTouchEvent("touchmove", target, [
          createTouch(target, { x: 150, y: 100 }),
          createTouch(target, { x: 250, y: 100 }),
        ]),
      );

      expect(x()).toBe(0);
      dispose();
    });
  });

  it("cancels swipe if vertical movement is dominant", () => {
    createRoot((dispose) => {
      const { x, handlers } = useSwipe();
      const target = document.createElement("div");

      handlers.ontouchstart(
        createTouchEvent("touchstart", target, [
          createTouch(target, { x: 100, y: 100 }),
        ]),
      );

      // Move slightly horizontally (10px) but mostly vertically (50px)
      handlers.ontouchmove(
        createTouchEvent("touchmove", target, [
          createTouch(target, { x: 110, y: 150 }),
        ]),
      );

      expect(x()).toBe(0);
      dispose();
    });
  });

  it("resets x to 0 and stops swiping on touchcancel", () => {
    createRoot((dispose) => {
      const { x, handlers } = useSwipe();
      const target = document.createElement("div");

      handlers.ontouchstart(
        createTouchEvent("touchstart", target, [
          createTouch(target, { x: 100, y: 100 }),
        ]),
      );

      handlers.ontouchmove(
        createTouchEvent("touchmove", target, [
          createTouch(target, { x: 150, y: 100 }),
        ]),
      );

      expect(x()).toBe(50);

      handlers.ontouchcancel(createTouchEvent("touchcancel", target, []));

      expect(x()).toBe(0);

      // Subsequent moves should be ignored
      handlers.ontouchmove(
        createTouchEvent("touchmove", target, [
          createTouch(target, { x: 160, y: 100 }),
        ]),
      );
      expect(x()).toBe(0);

      dispose();
    });
  });

  it("calls preventDefault during horizontal swipe", () => {
    createRoot((dispose) => {
      const { handlers } = useSwipe();
      const target = document.createElement("div");

      handlers.ontouchstart(
        createTouchEvent("touchstart", target, [
          createTouch(target, { x: 100, y: 100 }),
        ]),
      );

      const moveEvent = createTouchEvent("touchmove", target, [
        createTouch(target, { x: 110, y: 100 }),
      ]);
      const preventDefaultSpy = vi.spyOn(moveEvent, "preventDefault");

      handlers.ontouchmove(moveEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      dispose();
    });
  });

  it("cancels swipe if vertical movement exceeds 50px", () => {
    createRoot((dispose) => {
      const { x, handlers } = useSwipe();
      const target = document.createElement("div");

      handlers.ontouchstart(
        createTouchEvent("touchstart", target, [
          createTouch(target, { x: 100, y: 100 }),
        ]),
      );

      // Horizontal movement 10px, Vertical 51px
      handlers.ontouchmove(
        createTouchEvent("touchmove", target, [
          createTouch(target, { x: 110, y: 151 }),
        ]),
      );

      expect(x()).toBe(0);
      dispose();
    });
  });

  it("cancels swipe if vertical movement exceeds 50px even if horizontal is larger", () => {
    createRoot((dispose) => {
      const { x, handlers } = useSwipe();
      const target = document.createElement("div");

      handlers.ontouchstart(
        createTouchEvent("touchstart", target, [
          createTouch(target, { x: 100, y: 100 }),
        ]),
      );

      // Horizontal movement 100px, Vertical 51px
      handlers.ontouchmove(
        createTouchEvent("touchmove", target, [
          createTouch(target, { x: 200, y: 151 }),
        ]),
      );

      expect(x()).toBe(0);
      dispose();
    });
  });

  it("does not start swiping if disabled", () => {
    createRoot((dispose) => {
      const { x, handlers } = useSwipe({ disabled: true });
      const target = document.createElement("div");

      handlers.ontouchstart(
        createTouchEvent("touchstart", target, [
          createTouch(target, { x: 100, y: 100 }),
        ]),
      );

      handlers.ontouchmove(
        createTouchEvent("touchmove", target, [
          createTouch(target, { x: 150, y: 100 }),
        ]),
      );

      expect(x()).toBe(0);
      dispose();
    });
  });
});

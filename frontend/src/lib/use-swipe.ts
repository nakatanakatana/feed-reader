import { createSignal } from "solid-js";

interface UseSwipeOptions {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function useSwipe(options: UseSwipeOptions = {}) {
  const [x, setX] = createSignal(0);
  let startX = 0;
  let startY = 0;
  let isSwiping = false;
  let isCancelled = false;

  const touchstart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isSwiping = true;
    isCancelled = false;
  };

  const touchmove = (e: TouchEvent) => {
    if (!isSwiping || isCancelled || e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX;
    const diffY = currentY - startY;

    // If movement is mostly vertical, cancel swipe
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) {
      isCancelled = true;
      setX(0);
      return;
    }

    setX(diffX);
  };

  const touchend = (_e: TouchEvent) => {
    if (!isSwiping || isCancelled) {
      setX(0);
      isSwiping = false;
      return;
    }

    const currentX = x();
    const threshold = options.threshold ?? 50;

    if (currentX > threshold && options.onSwipeRight) {
      options.onSwipeRight();
    } else if (currentX < -threshold && options.onSwipeLeft) {
      options.onSwipeLeft();
    }

    setX(0);
    isSwiping = false;
  };

  return {
    x,
    handlers: {
      ontouchstart: touchstart,
      ontouchmove: touchmove,
      ontouchend: touchend,
    },
  };
}
